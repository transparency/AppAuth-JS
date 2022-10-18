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
    NodeBasedHandler.prototype.performAuthorizationRequest = function (configuration, request, url_opener) {
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
        this.authorizationPromise = new Promise(function (resolve, reject) {
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
        });
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
            if (typeof url_opener === "function")
                url_opener(url);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUV2Qyx5QkFBMkI7QUFFM0Isa0ZBQTJHO0FBQzNHLG9FQUFvRjtBQUdwRixvQ0FBOEI7QUFDOUIsNERBQThFO0FBQzlFLCtDQUEwQztBQUkxQyxtQ0FBc0M7QUFFdEM7SUFBa0MsdUNBQVk7SUFBOUM7O0lBR0EsQ0FBQztJQUZRLHNDQUFrQixHQUFHLGlCQUFpQixDQUFDO0lBQ3ZDLDZDQUF5QixHQUFHLHdCQUF3QixDQUFDO0lBQzlELDBCQUFDO0NBQUEsQUFIRCxDQUFrQyxZQUFZLEdBRzdDO0FBRUQ7SUFBc0Msb0NBQTJCO0lBSS9EO0lBQ0ksdUJBQXVCO0lBQ2hCLGNBQXFCLEVBQzVCLEtBQXFELEVBQ3JELE1BQWlDO1FBRjFCLCtCQUFBLEVBQUEscUJBQXFCO1FBQzVCLHNCQUFBLEVBQUEsWUFBOEIsMENBQXFCLEVBQUU7UUFDckQsdUJBQUEsRUFBQSxhQUFxQix5QkFBVSxFQUFFO1FBSnJDLFlBS0Usa0JBQU0sS0FBSyxFQUFFLE1BQU0sQ0FBQyxTQUNyQjtRQUpVLG9CQUFjLEdBQWQsY0FBYyxDQUFPO1FBTGhDLGtEQUFrRDtRQUNsRCwwQkFBb0IsR0FBb0QsSUFBSSxDQUFDOztJQVE3RSxDQUFDO0lBRUQsc0RBQTJCLEdBQTNCLFVBQ0ksYUFBZ0QsRUFDaEQsT0FBNkIsRUFDN0IsVUFBcUI7UUFIekIsaUJBb0dDO1FBL0ZDLHVFQUF1RTtRQUN2RSwyREFBMkQ7UUFDM0QsSUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBRTFDLElBQU0sY0FBYyxHQUFHLFVBQUMsV0FBaUMsRUFBRSxRQUE2QjtZQUN0RixJQUFJLENBQUMs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bnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHRcbiAqIGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGVcbiAqIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyXG4gKiBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgSHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbl9yZXF1ZXN0JztcbmltcG9ydCB7QXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyLCBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3RfaGFuZGxlcic7XG5pbXBvcnQge0F1dGhvcml6YXRpb25FcnJvciwgQXV0aG9yaXphdGlvblJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3Jlc3BvbnNlJztcbmltcG9ydCB7QXV0aG9yaXphdGlvblNlcnZpY2VDb25maWd1cmF0aW9ufSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3NlcnZpY2VfY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0NyeXB0b30gZnJvbSAnLi4vY3J5cHRvX3V0aWxzJztcbmltcG9ydCB7bG9nfSBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHtCYXNpY1F1ZXJ5U3RyaW5nVXRpbHMsIFF1ZXJ5U3RyaW5nVXRpbHN9IGZyb20gJy4uL3F1ZXJ5X3N0cmluZ191dGlscyc7XG5pbXBvcnQge05vZGVDcnlwdG99IGZyb20gJy4vY3J5cHRvX3V0aWxzJztcblxuLy8gVHlwZVNjcmlwdCB0eXBpbmdzIGZvciBgb3BlbmVyYCBhcmUgbm90IGNvcnJlY3QgYW5kIGRvIG5vdCBleHBvcnQgaXQgYXMgbW9kdWxlXG5pbXBvcnQgb3BlbmVyID0gcmVxdWlyZSgnb3BlbmVyJyk7XG5pbXBvcnQge1NlcnZlckhvbGRlcn0gZnJvbSBcIi4vU2VydmVyXCI7XG5cbmNsYXNzIFNlcnZlckV2ZW50c0VtaXR0ZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBzdGF0aWMgT05fVU5BQkxFX1RPX1NUQVJUID0gJ3VuYWJsZV90b19zdGFydCc7XG4gIHN0YXRpYyBPTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFID0gJ2F1dGhvcml6YXRpb25fcmVzcG9uc2UnO1xufVxuXG5leHBvcnQgY2xhc3MgTm9kZUJhc2VkSGFuZGxlciBleHRlbmRzIEF1dGhvcml6YXRpb25SZXF1ZXN0SGFuZGxlciB7XG4gIC8vIHRoZSBoYW5kbGUgdG8gdGhlIGN1cnJlbnQgYXV0aG9yaXphdGlvbiByZXF1ZXN0XG4gIGF1dGhvcml6YXRpb25Qcm9taXNlOiBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2V8bnVsbD58bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvLyBkZWZhdWx0IHRvIHBvcnQgODAwMFxuICAgICAgcHVibGljIGh0dHBTZXJ2ZXJQb3J0ID0gODAwMCxcbiAgICAgIHV0aWxzOiBRdWVyeVN0cmluZ1V0aWxzID0gbmV3IEJhc2ljUXVlcnlTdHJpbmdVdGlscygpLFxuICAgICAgY3J5cHRvOiBDcnlwdG8gPSBuZXcgTm9kZUNyeXB0bygpKSB7XG4gICAgc3VwZXIodXRpbHMsIGNyeXB0byk7XG4gIH1cblxuICBwZXJmb3JtQXV0aG9yaXphdGlvblJlcXVlc3QoXG4gICAgICBjb25maWd1cmF0aW9uOiBBdXRob3JpemF0aW9uU2VydmljZUNvbmZpZ3VyYXRpb24sXG4gICAgICByZXF1ZXN0OiBBdXRob3JpemF0aW9uUmVxdWVzdCxcbiAgICAgIHVybF9vcGVuZXI/OiBGdW5jdGlvblxuICApIHtcbiAgICAvLyB1c2Ugb3BlbmVyIHRvIGxhdW5jaCBhIHdlYiBicm93c2VyIGFuZCBzdGFydCB0aGUgYXV0aG9yaXphdGlvbiBmbG93LlxuICAgIC8vIHN0YXJ0IGEgd2ViIHNlcnZlciB0byBoYW5kbGUgdGhlIGF1dGhvcml6YXRpb24gcmVzcG9uc2UuXG4gICAgY29uc3QgZW1pdHRlciA9IG5ldyBTZXJ2ZXJFdmVudHNFbWl0dGVyKCk7XG5cbiAgICBjb25zdCByZXF1ZXN0SGFuZGxlciA9IChodHRwUmVxdWVzdDogSHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlc3BvbnNlOiBIdHRwLlNlcnZlclJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAoIWh0dHBSZXF1ZXN0LnVybCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVybCA9IFVybC5wYXJzZShodHRwUmVxdWVzdC51cmwpO1xuICAgICAgY29uc3Qgc2VhcmNoUGFyYW1zID0gbmV3IFVybC5VUkxTZWFyY2hQYXJhbXModXJsLnF1ZXJ5IHx8ICcnKTtcblxuICAgICAgY29uc3Qgc3RhdGUgPSBzZWFyY2hQYXJhbXMuZ2V0KCdzdGF0ZScpIHx8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGNvZGUgPSBzZWFyY2hQYXJhbXMuZ2V0KCdjb2RlJyk7XG4gICAgICBjb25zdCBlcnJvciA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yJyk7XG5cbiAgICAgIGlmICghc3RhdGUgJiYgIWNvZGUgJiYgIWVycm9yKSB7XG4gICAgICAgIC8vIGlnbm9yZSBpcnJlbGV2YW50IHJlcXVlc3RzIChlLmcuIGZhdmljb24uaWNvKVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvZygnSGFuZGxpbmcgQXV0aG9yaXphdGlvbiBSZXF1ZXN0ICcsIHNlYXJjaFBhcmFtcywgc3RhdGUsIGNvZGUsIGVycm9yKTtcbiAgICAgIGxldCBhdXRob3JpemF0aW9uUmVzcG9uc2U6IEF1dGhvcml6YXRpb25SZXNwb25zZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCBhdXRob3JpemF0aW9uRXJyb3I6IEF1dGhvcml6YXRpb25FcnJvcnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBsb2coJ2Vycm9yJyk7XG4gICAgICAgIC8vIGdldCBhZGRpdGlvbmFsIG9wdGlvbmFsIGluZm8uXG4gICAgICAgIGNvbnN0IGVycm9yVXJpID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3JfdXJpJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBlcnJvckRlc2NyaXB0aW9uID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3JfZGVzY3JpcHRpb24nKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGF1dGhvcml6YXRpb25FcnJvciA9IG5ldyBBdXRob3JpemF0aW9uRXJyb3IoXG4gICAgICAgICAgICB7ZXJyb3I6IGVycm9yLCBlcnJvcl9kZXNjcmlwdGlvbjogZXJyb3JEZXNjcmlwdGlvbiwgZXJyb3JfdXJpOiBlcnJvclVyaSwgc3RhdGU6IHN0YXRlfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdXRob3JpemF0aW9uUmVzcG9uc2UgPSBuZXcgQXV0aG9yaXphdGlvblJlc3BvbnNlKHtjb2RlOiBjb2RlISwgc3RhdGU6IHN0YXRlIX0pO1xuICAgICAgfVxuICAgICAgY29uc3QgY29tcGxldGVSZXNwb25zZSA9IHtcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgcmVzcG9uc2U6IGF1dGhvcml6YXRpb25SZXNwb25zZSxcbiAgICAgICAgZXJyb3I6IGF1dGhvcml6YXRpb25FcnJvclxuICAgICAgfSBhcyBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlO1xuICAgICAgZW1pdHRlci5lbWl0KFNlcnZlckV2ZW50c0VtaXR0ZXIuT05fQVVUSE9SSVpBVElPTl9SRVNQT05TRSwgY29tcGxldGVSZXNwb25zZSk7XG4gICAgICByZXNwb25zZS5lbmQoJ1N1Y2Nlc3NmdWxseSBsb2dnZWQgaW4gdG8gTWlnaHR5VGV4dC4gUGxlYXNlIHN3aXRjaCBiYWNrIHRvIHRoZSBNaWdodHlUZXh0IERlc2t0b3AgQXBwLiAoWW91IGNhbiBzYWZlbHkgY2xvc2UgdGhpcyB3aW5kb3cpJyk7XG4gICAgfTtcblxuICAgIHRoaXMuYXV0aG9yaXphdGlvblByb21pc2UgPSBuZXcgUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBlbWl0dGVyLm9uY2UoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9VTkFCTEVfVE9fU1RBUlQsICgpID0+IHtcbiAgICAgICAgcmVqZWN0KGBVbmFibGUgdG8gY3JlYXRlIEhUVFAgc2VydmVyIGF0IHBvcnQgJHt0aGlzLmh0dHBTZXJ2ZXJQb3J0fWApO1xuICAgICAgfSk7XG4gICAgICBlbWl0dGVyLm9uY2UoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFLCAocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgU2VydmVySG9sZGVyLmdldCgpLmNsb3NlKCk7XG4gICAgICAgIC8vIHNlcnZlci5jbG9zZSgpO1xuICAgICAgICAvLyByZXNvbHZlIHBlbmRpbmcgcHJvbWlzZVxuICAgICAgICByZXNvbHZlKHJlc3VsdCBhcyBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlKTtcbiAgICAgICAgLy8gY29tcGxldGUgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICAgIHRoaXMuY29tcGxldGVBdXRob3JpemF0aW9uUmVxdWVzdElmUG9zc2libGUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gbGV0IHNlcnZlcjogSHR0cC5TZXJ2ZXI7XG4gICAgcmVxdWVzdC5zZXR1cENvZGVWZXJpZmllcigpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIgPSBIdHRwLmNyZWF0ZVNlcnZlcihyZXF1ZXN0SGFuZGxlcik7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIubGlzdGVuKHRoaXMuaHR0cFNlcnZlclBvcnQpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIDIwMTkxMjE5LlMuSS4gLSBUaGUgY3JlYXRlU2VydmVyIG1ldGhvZCB3aWxsIGNyZWF0ZSBhIG5ldyBodHRwIHNlcnZlciBsaXN0ZW5pbmcgb24gdGhlIHBvcnQgc3BlY2lmaWVkIGlmIG9uZVxuICAgICAgICAgICAgYSBzZXJ2ZXIgaXMgbm90IGFscmVhZHkgcnVubmluZy4gSWYgb25lIGlzIHJ1bm5pbmcgaXQgd2lsbCBqdXN0IHJlbW92ZSBhbnkgZXhpc3RpbmcgcmVxdWVzdExpc3RlbmVycyBhbmQgYWRkXG4gICAgICAgICAgICBhIG5ldyBvbmUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNlcnZlckhvbGRlci5nZXQoKS5jcmVhdGVTZXJ2ZXIodGhpcy5odHRwU2VydmVyUG9ydCwgcmVxdWVzdEhhbmRsZXIpO1xuICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICBsb2coYFtNVCBBUFAgQVVUSF1bRVJST1JdIFVuYWJsZSB0byBzZXR1cCBzZXJ2ZXJzYCwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRSZXF1ZXN0VXJsKGNvbmZpZ3VyYXRpb24sIHJlcXVlc3QpO1xuICAgICAgICAgIGxvZygnTWFraW5nIGEgcmVxdWVzdCB0byAnLCByZXF1ZXN0LCB1cmwpO1xuICAgICAgICAgIGlmKHR5cGVvZiB1cmxfb3BlbmVyID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICB1cmxfb3BlbmVyKHVybCk7XG4gICAgICAgICAgLy8gY29uc3Qgd2luZG93UHJvY2VzcyA9IG9wZW5lcih1cmwse30sIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIC8vICAgbG9nKGBbTVQgQVBQIEFVVEhdIFdpbmRvdyBvcGVuZWQgY2FsbGJhY2sgdHJpZ2dlcmVkISBhcmd1bWVudCByZXR1cm5lZCBpbiBjYWxsYmFja2AsIGUpO1xuICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgIC8vIG9wZW5lcih1cmwpO1xuICAgICAgICAgIC8vIGxvZyhgW01UIEFQUCBBVVRIXSBXaW5kb3cgcmV0dXJuZWQgYnkgb3BlbmVyIG1ldGhvZDpgLCB3aW5kb3dQcm9jZXNzKTtcbiAgICAgICAgICAvLyBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgLy8gICB0cnl7XG4gICAgICAgICAgLy8gICAgIGxvZyhgW01UIEFQUCBBVVRIXSBraWxsaW5nIHRoZSBwcm9jZXNzIWApO1xuICAgICAgICAgIC8vICAgICB3aW5kb3dQcm9jZXNzLmtpbGwoKTtcbiAgICAgICAgICAvLyAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIHByb2Nlc3Mga2lsbGVkP2AsIHdpbmRvd1Byb2Nlc3Mua2lsbGVkKTtcbiAgICAgICAgICAvLyAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgLy8gICAgIGxvZyhgW01UIEFQUCBBVVRIXSBFcnJvciBvY2N1cnJlZCBhYm9ydGluZyBwcm9jZXNzYCwgZSk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gfSwgNTAwMCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBsb2coJ1NvbWV0aGluZyBiYWQgaGFwcGVuZWQgJywgZXJyb3IpO1xuICAgICAgICAgIGVtaXR0ZXIuZW1pdChTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBsZXRlQXV0aG9yaXphdGlvblJlcXVlc3QoKTogUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfG51bGw+IHtcbiAgICBpZiAoIXRoaXMuYXV0aG9yaXphdGlvblByb21pc2UpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgICAnTm8gcGVuZGluZyBhdXRob3JpemF0aW9uIHJlcXVlc3QuIENhbGwgcGVyZm9ybUF1dGhvcml6YXRpb25SZXF1ZXN0KCkgPycpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlO1xuICB9XG59XG4iXX0=