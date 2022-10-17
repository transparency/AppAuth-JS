"use strict";
/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = require("events");
var Url = require("url");
var authorization_request_handler_1 = require("../authorization_request_handler");
var authorization_response_1 = require("../authorization_response");
var logger_1 = require("../logger");
var query_string_utils_1 = require("../query_string_utils");
var crypto_utils_1 = require("./crypto_utils");
var Server_1 = require("./Server");
var ServerEventsEmitter = /** @class */ (function (_super) {
    __extends(ServerEventsEmitter, _super);
    function ServerEventsEmitter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ServerEventsEmitter.ON_UNABLE_TO_START = 'unable_to_start';
    ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE = 'authorization_response';
    return ServerEventsEmitter;
}(EventEmitter));
var NodeBasedHandler = /** @class */ (function (_super) {
    __extends(NodeBasedHandler, _super);
    function NodeBasedHandler(
    // default to port 8000
    httpServerPort, utils, crypto) {
        if (httpServerPort === void 0) { httpServerPort = 8000; }
        if (utils === void 0) { utils = new query_string_utils_1.BasicQueryStringUtils(); }
        if (crypto === void 0) { crypto = new crypto_utils_1.NodeCrypto(); }
        var _this = _super.call(this, utils, crypto) || this;
        _this.httpServerPort = httpServerPort;
        // the handle to the current authorization request
        _this.authorizationPromise = null;
        return _this;
    }
    NodeBasedHandler.prototype.performAuthorizationRequest = function (configuration, request) {
        var _this = this;
        // use opener to launch a web browser and start the authorization flow.
        // start a web server to handle the authorization response.
        var emitter = new ServerEventsEmitter();
        var requestHandler = function (httpRequest, response) {
            if (!httpRequest.url) {
                return;
            }
            var url = Url.parse(httpRequest.url);
            var searchParams = new Url.URLSearchParams(url.query || '');
            var state = searchParams.get('state') || undefined;
            var code = searchParams.get('code');
            var error = searchParams.get('error');
            if (!state && !code && !error) {
                // ignore irrelevant requests (e.g. favicon.ico)
                return;
            }
            logger_1.log('Handling Authorization Request ', searchParams, state, code, error);
            var authorizationResponse = null;
            var authorizationError = null;
            if (error) {
                logger_1.log('error');
                // get additional optional info.
                var errorUri = searchParams.get('error_uri') || undefined;
                var errorDescription = searchParams.get('error_description') || undefined;
                authorizationError = new authorization_response_1.AuthorizationError({ error: error, error_description: errorDescription, error_uri: errorUri, state: state });
            }
            else {
                authorizationResponse = new authorization_response_1.AuthorizationResponse({ code: code, state: state });
            }
            var completeResponse = {
                request: request,
                response: authorizationResponse,
                error: authorizationError
            };
            emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, completeResponse);
            response.end('Successfully logged in to MightyText. Please switch back to the MightyText Desktop App. (You can safely close this window)');
        };
        try {
            this.authorizationPromise = new Promise(function (resolve, reject) {
                try {
                    emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, function () {
                        reject("Unable to create HTTP server at port " + _this.httpServerPort);
                    });
                    emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, function (result) {
                        Server_1.ServerHolder.get().close();
                        // server.close();
                        // resolve pending promise
                        resolve(result);
                        // complete authorization flow
                        _this.completeAuthorizationRequestIfPossible();
                    });
                }
                catch (e) {
                    reject("[MT APP AUTH] Unable to setup listeners on the emitter");
                }
            });
        }
        catch (e) {
            logger_1.log("[MT APP AUTH] Unable to initialize authorizationPromise!", e);
        }
        // let server: Http.Server;
        request.setupCodeVerifier()
            .then(function () {
            try {
                // server = Http.createServer(requestHandler);
                // server.listen(this.httpServerPort);
                /*
                20191219.S.I. - The createServer method will create a new http server listening on the port specified if one
                a server is not already running. If one is running it will just remove any existing requestListeners and add
                a new one.
                 */
                Server_1.ServerHolder.get().createServer(_this.httpServerPort, requestHandler);
            }
            catch (e) {
                logger_1.log("[MT APP AUTH][ERROR] Unable to setup servers", e);
            }
            var url = _this.buildRequestUrl(configuration, request);
            logger_1.log('Making a request to ', request, url);
            // const windowProcess = opener(url,{}, function(e){
            //   log(`[MT APP AUTH] Window opened callback triggered! argument returned in callback`, e);
            // });
            // opener(url);
            // log(`[MT APP AUTH] Window returned by opener method:`, windowProcess);
            // setTimeout(()=>{
            //   try{
            //     log(`[MT APP AUTH] killing the process!`);
            //     windowProcess.kill();
            //     log(`[MT APP AUTH] process killed?`, windowProcess.killed);
            //   } catch(e){
            //     log(`[MT APP AUTH] Error occurred aborting process`, e);
            //   }
            // }, 5000);
        })
            .catch(function (error) {
            logger_1.log('Something bad happened ', error);
            emitter.emit(ServerEventsEmitter.ON_UNABLE_TO_START);
        });
    };
    NodeBasedHandler.prototype.completeAuthorizationRequest = function () {
        if (!this.authorizationPromise) {
            return Promise.reject('No pending authorization request. Call performAuthorizationRequest() ?');
        }
        return this.authorizationPromise;
    };
    return NodeBasedHandler;
}(authorization_request_handler_1.AuthorizationRequestHandler));
exports.NodeBasedHandler = NodeBasedHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUV2Qyx5QkFBMkI7QUFFM0Isa0ZBQTJHO0FBQzNHLG9FQUFvRjtBQUdwRixvQ0FBOEI7QUFDOUIsNERBQThFO0FBQzlFLCtDQUEwQztBQUkxQyxtQ0FBc0M7QUFFdEM7SUFBa0MsdUNBQVk7SUFBOUM7O0lBR0EsQ0FBQztJQUZRLHNDQUFrQixHQUFHLGlCQUFpQixDQUFDO0lBQ3ZDLDZDQUF5QixHQUFHLHdCQUF3QixDQUFDO0lBQzlELDBCQUFDO0NBQUEsQUFIRCxDQUFrQyxZQUFZLEdBRzdDO0FBRUQ7SUFBc0Msb0NBQTJCO0lBSS9EO0lBQ0ksdUJBQXVCO0lBQ2hCLGNBQXFCLEVBQzVCLEtBQXFELEVBQ3JELE1BQWlDO1FBRjFCLCtCQUFBLEVBQUEscUJBQXFCO1FBQzVCLHNCQUFBLEVBQUEsWUFBOEIsMENBQXFCLEVBQUU7UUFDckQsdUJBQUEsRUFBQSxhQUFxQix5QkFBVSxFQUFFO1FBSnJDLFlBS0Usa0JBQU0sS0FBSyxFQUFFLE1BQU0sQ0FBQyxTQUNyQjtRQUpVLG9CQUFjLEdBQWQsY0FBYyxDQUFPO1FBTGhDLGtEQUFrRDtRQUNsRCwwQkFBb0IsR0FBb0QsSUFBSSxDQUFDOztJQVE3RSxDQUFDO0lBRUQsc0RBQTJCLEdBQTNCLFVBQ0ksYUFBZ0QsRUFDaEQsT0FBNkI7UUFGakMsaUJBd0dDO1FBckdDLHVFQUF1RTtRQUN2RSwyREFBMkQ7UUFDM0QsSUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBRTFDLElBQU0sY0FBYyxHQUFHLFVBQUMsV0FBaUMsRUFBRSxRQUE2QjtZQUN0RixJQUFJLENBQUMsV0FBVyxDQUFDLEdB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b0IsQ0FBQztJQUNuQyxDQUFDO0lBQ0gsdUJBQUM7QUFBRCxDQUFDLEFBOUhELENBQXNDLDJEQUEyQixHQThIaEU7QUE5SFksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHRcbiAqIGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGVcbiAqIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyXG4gKiBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgSHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbl9yZXF1ZXN0JztcbmltcG9ydCB7QXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyLCBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3RfaGFuZGxlcic7XG5pbXBvcnQge0F1dGhvcml6YXRpb25FcnJvciwgQXV0aG9yaXphdGlvblJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3Jlc3BvbnNlJztcbmltcG9ydCB7QXV0aG9yaXphdGlvblNlcnZpY2VDb25maWd1cmF0aW9ufSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3NlcnZpY2VfY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0NyeXB0b30gZnJvbSAnLi4vY3J5cHRvX3V0aWxzJztcbmltcG9ydCB7bG9nfSBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHtCYXNpY1F1ZXJ5U3RyaW5nVXRpbHMsIFF1ZXJ5U3RyaW5nVXRpbHN9IGZyb20gJy4uL3F1ZXJ5X3N0cmluZ191dGlscyc7XG5pbXBvcnQge05vZGVDcnlwdG99IGZyb20gJy4vY3J5cHRvX3V0aWxzJztcblxuLy8gVHlwZVNjcmlwdCB0eXBpbmdzIGZvciBgb3BlbmVyYCBhcmUgbm90IGNvcnJlY3QgYW5kIGRvIG5vdCBleHBvcnQgaXQgYXMgbW9kdWxlXG5pbXBvcnQgb3BlbmVyID0gcmVxdWlyZSgnb3BlbmVyJyk7XG5pbXBvcnQge1NlcnZlckhvbGRlcn0gZnJvbSBcIi4vU2VydmVyXCI7XG5cbmNsYXNzIFNlcnZlckV2ZW50c0VtaXR0ZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBzdGF0aWMgT05fVU5BQkxFX1RPX1NUQVJUID0gJ3VuYWJsZV90b19zdGFydCc7XG4gIHN0YXRpYyBPTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFID0gJ2F1dGhvcml6YXRpb25fcmVzcG9uc2UnO1xufVxuXG5leHBvcnQgY2xhc3MgTm9kZUJhc2VkSGFuZGxlciBleHRlbmRzIEF1dGhvcml6YXRpb25SZXF1ZXN0SGFuZGxlciB7XG4gIC8vIHRoZSBoYW5kbGUgdG8gdGhlIGN1cnJlbnQgYXV0aG9yaXphdGlvbiByZXF1ZXN0XG4gIGF1dGhvcml6YXRpb25Qcm9taXNlOiBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2V8bnVsbD58bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvLyBkZWZhdWx0IHRvIHBvcnQgODAwMFxuICAgICAgcHVibGljIGh0dHBTZXJ2ZXJQb3J0ID0gODAwMCxcbiAgICAgIHV0aWxzOiBRdWVyeVN0cmluZ1V0aWxzID0gbmV3IEJhc2ljUXVlcnlTdHJpbmdVdGlscygpLFxuICAgICAgY3J5cHRvOiBDcnlwdG8gPSBuZXcgTm9kZUNyeXB0bygpKSB7XG4gICAgc3VwZXIodXRpbHMsIGNyeXB0byk7XG4gIH1cblxuICBwZXJmb3JtQXV0aG9yaXphdGlvblJlcXVlc3QoXG4gICAgICBjb25maWd1cmF0aW9uOiBBdXRob3JpemF0aW9uU2VydmljZUNvbmZpZ3VyYXRpb24sXG4gICAgICByZXF1ZXN0OiBBdXRob3JpemF0aW9uUmVxdWVzdCkge1xuICAgIC8vIHVzZSBvcGVuZXIgdG8gbGF1bmNoIGEgd2ViIGJyb3dzZXIgYW5kIHN0YXJ0IHRoZSBhdXRob3JpemF0aW9uIGZsb3cuXG4gICAgLy8gc3RhcnQgYSB3ZWIgc2VydmVyIHRvIGhhbmRsZSB0aGUgYXV0aG9yaXphdGlvbiByZXNwb25zZS5cbiAgICBjb25zdCBlbWl0dGVyID0gbmV3IFNlcnZlckV2ZW50c0VtaXR0ZXIoKTtcblxuICAgIGNvbnN0IHJlcXVlc3RIYW5kbGVyID0gKGh0dHBSZXF1ZXN0OiBIdHRwLkluY29taW5nTWVzc2FnZSwgcmVzcG9uc2U6IEh0dHAuU2VydmVyUmVzcG9uc2UpID0+IHtcbiAgICAgIGlmICghaHR0cFJlcXVlc3QudXJsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXJsID0gVXJsLnBhcnNlKGh0dHBSZXF1ZXN0LnVybCk7XG4gICAgICBjb25zdCBzZWFyY2hQYXJhbXMgPSBuZXcgVXJsLlVSTFNlYXJjaFBhcmFtcyh1cmwucXVlcnkgfHwgJycpO1xuXG4gICAgICBjb25zdCBzdGF0ZSA9IHNlYXJjaFBhcmFtcy5nZXQoJ3N0YXRlJykgfHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3QgY29kZSA9IHNlYXJjaFBhcmFtcy5nZXQoJ2NvZGUnKTtcbiAgICAgIGNvbnN0IGVycm9yID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3InKTtcblxuICAgICAgaWYgKCFzdGF0ZSAmJiAhY29kZSAmJiAhZXJyb3IpIHtcbiAgICAgICAgLy8gaWdub3JlIGlycmVsZXZhbnQgcmVxdWVzdHMgKGUuZy4gZmF2aWNvbi5pY28pXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9nKCdIYW5kbGluZyBBdXRob3JpemF0aW9uIFJlcXVlc3QgJywgc2VhcmNoUGFyYW1zLCBzdGF0ZSwgY29kZSwgZXJyb3IpO1xuICAgICAgbGV0IGF1dGhvcml6YXRpb25SZXNwb25zZTogQXV0aG9yaXphdGlvblJlc3BvbnNlfG51bGwgPSBudWxsO1xuICAgICAgbGV0IGF1dGhvcml6YXRpb25FcnJvcjogQXV0aG9yaXphdGlvbkVycm9yfG51bGwgPSBudWxsO1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGxvZygnZXJyb3InKTtcbiAgICAgICAgLy8gZ2V0IGFkZGl0aW9uYWwgb3B0aW9uYWwgaW5mby5cbiAgICAgICAgY29uc3QgZXJyb3JVcmkgPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcl91cmknKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGVycm9yRGVzY3JpcHRpb24gPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcl9kZXNjcmlwdGlvbicpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgYXV0aG9yaXphdGlvbkVycm9yID0gbmV3IEF1dGhvcml6YXRpb25FcnJvcihcbiAgICAgICAgICAgIHtlcnJvcjogZXJyb3IsIGVycm9yX2Rlc2NyaXB0aW9uOiBlcnJvckRlc2NyaXB0aW9uLCBlcnJvcl91cmk6IGVycm9yVXJpLCBzdGF0ZTogc3RhdGV9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF1dGhvcml6YXRpb25SZXNwb25zZSA9IG5ldyBBdXRob3JpemF0aW9uUmVzcG9uc2Uoe2NvZGU6IGNvZGUhLCBzdGF0ZTogc3RhdGUhfSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjb21wbGV0ZVJlc3BvbnNlID0ge1xuICAgICAgICByZXF1ZXN0LFxuICAgICAgICByZXNwb25zZTogYXV0aG9yaXphdGlvblJlc3BvbnNlLFxuICAgICAgICBlcnJvcjogYXV0aG9yaXphdGlvbkVycm9yXG4gICAgICB9IGFzIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2U7XG4gICAgICBlbWl0dGVyLmVtaXQoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFLCBjb21wbGV0ZVJlc3BvbnNlKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgnU3VjY2Vzc2Z1bGx5IGxvZ2dlZCBpbiB0byBNaWdodHlUZXh0LiBQbGVhc2Ugc3dpdGNoIGJhY2sgdG8gdGhlIE1pZ2h0eVRleHQgRGVza3RvcCBBcHAuIChZb3UgY2FuIHNhZmVseSBjbG9zZSB0aGlzIHdpbmRvdyknKTtcbiAgICB9O1xuXG4gICAgdHJ5e1xuICAgICAgdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2U+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCwgKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGBVbmFibGUgdG8gY3JlYXRlIEhUVFAgc2VydmVyIGF0IHBvcnQgJHt0aGlzLmh0dHBTZXJ2ZXJQb3J0fWApO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UsIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgU2VydmVySG9sZGVyLmdldCgpLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIHJlc29sdmUgcGVuZGluZyBwcm9taXNlXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCBhcyBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlKTtcbiAgICAgICAgICAgIC8vIGNvbXBsZXRlIGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAgICAgICAgdGhpcy5jb21wbGV0ZUF1dGhvcml6YXRpb25SZXF1ZXN0SWZQb3NzaWJsZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgIHJlamVjdChgW01UIEFQUCBBVVRIXSBVbmFibGUgdG8gc2V0dXAgbGlzdGVuZXJzIG9uIHRoZSBlbWl0dGVyYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICBsb2coYFtNVCBBUFAgQVVUSF0gVW5hYmxlIHRvIGluaXRpYWxpemUgYXV0aG9yaXphdGlvblByb21pc2UhYCwgZSk7XG4gICAgfVxuXG4gICAgLy8gbGV0IHNlcnZlcjogSHR0cC5TZXJ2ZXI7XG4gICAgcmVxdWVzdC5zZXR1cENvZGVWZXJpZmllcigpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIgPSBIdHRwLmNyZWF0ZVNlcnZlcihyZXF1ZXN0SGFuZGxlcik7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIubGlzdGVuKHRoaXMuaHR0cFNlcnZlclBvcnQpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIDIwMTkxMjE5LlMuSS4gLSBUaGUgY3JlYXRlU2VydmVyIG1ldGhvZCB3aWxsIGNyZWF0ZSBhIG5ldyBodHRwIHNlcnZlciBsaXN0ZW5pbmcgb24gdGhlIHBvcnQgc3BlY2lmaWVkIGlmIG9uZVxuICAgICAgICAgICAgYSBzZXJ2ZXIgaXMgbm90IGFscmVhZHkgcnVubmluZy4gSWYgb25lIGlzIHJ1bm5pbmcgaXQgd2lsbCBqdXN0IHJlbW92ZSBhbnkgZXhpc3RpbmcgcmVxdWVzdExpc3RlbmVycyBhbmQgYWRkXG4gICAgICAgICAgICBhIG5ldyBvbmUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNlcnZlckhvbGRlci5nZXQoKS5jcmVhdGVTZXJ2ZXIodGhpcy5odHRwU2VydmVyUG9ydCwgcmVxdWVzdEhhbmRsZXIpO1xuICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICBsb2coYFtNVCBBUFAgQVVUSF1bRVJST1JdIFVuYWJsZSB0byBzZXR1cCBzZXJ2ZXJzYCwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRSZXF1ZXN0VXJsKGNvbmZpZ3VyYXRpb24sIHJlcXVlc3QpO1xuICAgICAgICAgIGxvZygnTWFraW5nIGEgcmVxdWVzdCB0byAnLCByZXF1ZXN0LCB1cmwpO1xuICAgICAgICAgIC8vIGNvbnN0IHdpbmRvd1Byb2Nlc3MgPSBvcGVuZXIodXJsLHt9LCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAvLyAgIGxvZyhgW01UIEFQUCBBVVRIXSBXaW5kb3cgb3BlbmVkIGNhbGxiYWNrIHRyaWdnZXJlZCEgYXJndW1lbnQgcmV0dXJuZWQgaW4gY2FsbGJhY2tgLCBlKTtcbiAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICAvLyBvcGVuZXIodXJsKTtcbiAgICAgICAgICAvLyBsb2coYFtNVCBBUFAgQVVUSF0gV2luZG93IHJldHVybmVkIGJ5IG9wZW5lciBtZXRob2Q6YCwgd2luZG93UHJvY2Vzcyk7XG4gICAgICAgICAgLy8gc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgIC8vICAgdHJ5e1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0ga2lsbGluZyB0aGUgcHJvY2VzcyFgKTtcbiAgICAgICAgICAvLyAgICAgd2luZG93UHJvY2Vzcy5raWxsKCk7XG4gICAgICAgICAgLy8gICAgIGxvZyhgW01UIEFQUCBBVVRIXSBwcm9jZXNzIGtpbGxlZD9gLCB3aW5kb3dQcm9jZXNzLmtpbGxlZCk7XG4gICAgICAgICAgLy8gICB9IGNhdGNoKGUpe1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0gRXJyb3Igb2NjdXJyZWQgYWJvcnRpbmcgcHJvY2Vzc2AsIGUpO1xuICAgICAgICAgIC8vICAgfVxuICAgICAgICAgIC8vIH0sIDUwMDApO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgbG9nKCdTb21ldGhpbmcgYmFkIGhhcHBlbmVkICcsIGVycm9yKTtcbiAgICAgICAgICBlbWl0dGVyLmVtaXQoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9VTkFCTEVfVE9fU1RBUlQpO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21wbGV0ZUF1dGhvcml6YXRpb25SZXF1ZXN0KCk6IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZXxudWxsPiB7XG4gICAgaWYgKCF0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXG4gICAgICAgICAgJ05vIHBlbmRpbmcgYXV0aG9yaXphdGlvbiByZXF1ZXN0LiBDYWxsIHBlcmZvcm1BdXRob3JpemF0aW9uUmVxdWVzdCgpID8nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZTtcbiAgfVxufVxuIl19