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
// TypeScript typings for `opener` are not correct and do not export it as module
var opener = require('opener');
var exec = require("child_process").exec;
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
        // use open to launch a web browser and start the authorization flow.
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
            // const url = this.buildRequestUrl(configuration, request);
            var url = "https://mightytext.net";
            logger_1.log("[MT APP AUTH] Making a request to: \"" + url + "\"");
            var windowProcess = opener(url);
            // exec(`open '${url}'`, (err: any, stdout: string, stderr: string) => {
            //   if(err){
            //     log(`[MT APP AUTH] error:`, err);
            //   } else if (stderr){
            //     log(`[MT APP AUTH] error output:`, stderr);
            //   } else {
            //     log(`[MT APP AUTH] output:`, stdout);
            //   }
            // });
            // opener(url);
            // log(`[MT APP AUTH] Window returned by opener method:`, windowProcess);
            // log(`[MT APP AUTH] window process killed?`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUV2Qyx5QkFBMkI7QUFFM0Isa0ZBQTJHO0FBQzNHLG9FQUFvRjtBQUdwRixvQ0FBOEI7QUFDOUIsNERBQThFO0FBQzlFLCtDQUEwQztBQUUxQyxpRkFBaUY7QUFDakYsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pCLElBQUEsb0NBQUksQ0FBOEI7QUFFMUMsbUNBQXNDO0FBRXRDO0lBQWtDLHVDQUFZO0lBQTlDOztJQUdBLENBQUM7SUFGUSxzQ0FBa0IsR0FBRyxpQkFBaUIsQ0FBQztJQUN2Qyw2Q0FBeUIsR0FBRyx3QkFBd0IsQ0FBQztJQUM5RCwwQkFBQztDQUFBLEFBSEQsQ0FBa0MsWUFBWSxHQUc3QztBQUVEO0lBQXNDLG9DQUEyQjtJQUkvRDtJQUNJLHVCQUF1QjtJQUNoQixjQUFxQixFQUM1QixLQUFxRCxFQUNyRCxNQUFpQztRQUYxQiwrQkFBQSxFQUFBLHFCQUFxQjtRQUM1QixzQkFBQSxFQUFBLFlBQThCLDBDQUFxQixFQUFFO1FBQ3JELHVCQUFBLEVBQUEsYUFBcUIseUJBQVUsRUFBRTtRQUpyQyxZQUtFLGtCQUFNLEtBQUssRUFBRSxNQUFNLENBQUMsU0FDckI7UUFKVSxvQkFBYyxHQUFkLGNBQWMsQ0FBTztRQUxoQyxrREFBa0Q7UUFDbEQsMEJBQW9CLEdBQW9ELElBQUksQ0FBQzs7SUFRN0UsQ0FBQztJQUVELHNEQUEyQixHQUEzQixVQUNJLGFBQWdELEVBQ2hELE9BQTZCO1FBRmpDLGlCQWlIQztRQTlHQyxxRUFBcUU7UUFDckUsMkRBQTJEO1FBQzNELElBQU0sT0FBTyxHQUFHLElBQUksbUJBQW1C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QUFrQixDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRVMsdURBQTRCLEdBQXRDO1FBQ0UsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQ2pCLHdFQUF3RSxDQUFDLENBQUM7U0FDL0U7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztJQUNuQyxDQUFDO0lBQ0gsdUJBQUM7QUFBRCxDQUFDLEFBdklELENBQXNDLDJEQUEyQixHQXVJaEU7QUF2SVksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHRcbiAqIGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGVcbiAqIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyXG4gKiBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgSHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbl9yZXF1ZXN0JztcbmltcG9ydCB7QXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyLCBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3RfaGFuZGxlcic7XG5pbXBvcnQge0F1dGhvcml6YXRpb25FcnJvciwgQXV0aG9yaXphdGlvblJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3Jlc3BvbnNlJztcbmltcG9ydCB7QXV0aG9yaXphdGlvblNlcnZpY2VDb25maWd1cmF0aW9ufSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3NlcnZpY2VfY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0NyeXB0b30gZnJvbSAnLi4vY3J5cHRvX3V0aWxzJztcbmltcG9ydCB7bG9nfSBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHtCYXNpY1F1ZXJ5U3RyaW5nVXRpbHMsIFF1ZXJ5U3RyaW5nVXRpbHN9IGZyb20gJy4uL3F1ZXJ5X3N0cmluZ191dGlscyc7XG5pbXBvcnQge05vZGVDcnlwdG99IGZyb20gJy4vY3J5cHRvX3V0aWxzJztcblxuLy8gVHlwZVNjcmlwdCB0eXBpbmdzIGZvciBgb3BlbmVyYCBhcmUgbm90IGNvcnJlY3QgYW5kIGRvIG5vdCBleHBvcnQgaXQgYXMgbW9kdWxlXG5jb25zdCBvcGVuZXIgPSByZXF1aXJlKCdvcGVuZXInKTtcbmNvbnN0IHsgZXhlYyB9ID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7XG5cbmltcG9ydCB7U2VydmVySG9sZGVyfSBmcm9tIFwiLi9TZXJ2ZXJcIjtcblxuY2xhc3MgU2VydmVyRXZlbnRzRW1pdHRlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHN0YXRpYyBPTl9VTkFCTEVfVE9fU1RBUlQgPSAndW5hYmxlX3RvX3N0YXJ0JztcbiAgc3RhdGljIE9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UgPSAnYXV0aG9yaXphdGlvbl9yZXNwb25zZSc7XG59XG5cbmV4cG9ydCBjbGFzcyBOb2RlQmFzZWRIYW5kbGVyIGV4dGVuZHMgQXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyIHtcbiAgLy8gdGhlIGhhbmRsZSB0byB0aGUgY3VycmVudCBhdXRob3JpemF0aW9uIHJlcXVlc3RcbiAgYXV0aG9yaXphdGlvblByb21pc2U6IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZXxudWxsPnxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8vIGRlZmF1bHQgdG8gcG9ydCA4MDAwXG4gICAgICBwdWJsaWMgaHR0cFNlcnZlclBvcnQgPSA4MDAwLFxuICAgICAgdXRpbHM6IFF1ZXJ5U3RyaW5nVXRpbHMgPSBuZXcgQmFzaWNRdWVyeVN0cmluZ1V0aWxzKCksXG4gICAgICBjcnlwdG86IENyeXB0byA9IG5ldyBOb2RlQ3J5cHRvKCkpIHtcbiAgICBzdXBlcih1dGlscywgY3J5cHRvKTtcbiAgfVxuXG4gIHBlcmZvcm1BdXRob3JpemF0aW9uUmVxdWVzdChcbiAgICAgIGNvbmZpZ3VyYXRpb246IEF1dGhvcml6YXRpb25TZXJ2aWNlQ29uZmlndXJhdGlvbixcbiAgICAgIHJlcXVlc3Q6IEF1dGhvcml6YXRpb25SZXF1ZXN0KSB7XG4gICAgLy8gdXNlIG9wZW4gdG8gbGF1bmNoIGEgd2ViIGJyb3dzZXIgYW5kIHN0YXJ0IHRoZSBhdXRob3JpemF0aW9uIGZsb3cuXG4gICAgLy8gc3RhcnQgYSB3ZWIgc2VydmVyIHRvIGhhbmRsZSB0aGUgYXV0aG9yaXphdGlvbiByZXNwb25zZS5cbiAgICBjb25zdCBlbWl0dGVyID0gbmV3IFNlcnZlckV2ZW50c0VtaXR0ZXIoKTtcblxuICAgIGNvbnN0IHJlcXVlc3RIYW5kbGVyID0gKGh0dHBSZXF1ZXN0OiBIdHRwLkluY29taW5nTWVzc2FnZSwgcmVzcG9uc2U6IEh0dHAuU2VydmVyUmVzcG9uc2UpID0+IHtcbiAgICAgIGlmICghaHR0cFJlcXVlc3QudXJsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXJsID0gVXJsLnBhcnNlKGh0dHBSZXF1ZXN0LnVybCk7XG4gICAgICBjb25zdCBzZWFyY2hQYXJhbXMgPSBuZXcgVXJsLlVSTFNlYXJjaFBhcmFtcyh1cmwucXVlcnkgfHwgJycpO1xuXG4gICAgICBjb25zdCBzdGF0ZSA9IHNlYXJjaFBhcmFtcy5nZXQoJ3N0YXRlJykgfHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3QgY29kZSA9IHNlYXJjaFBhcmFtcy5nZXQoJ2NvZGUnKTtcbiAgICAgIGNvbnN0IGVycm9yID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3InKTtcblxuICAgICAgaWYgKCFzdGF0ZSAmJiAhY29kZSAmJiAhZXJyb3IpIHtcbiAgICAgICAgLy8gaWdub3JlIGlycmVsZXZhbnQgcmVxdWVzdHMgKGUuZy4gZmF2aWNvbi5pY28pXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9nKCdIYW5kbGluZyBBdXRob3JpemF0aW9uIFJlcXVlc3QgJywgc2VhcmNoUGFyYW1zLCBzdGF0ZSwgY29kZSwgZXJyb3IpO1xuICAgICAgbGV0IGF1dGhvcml6YXRpb25SZXNwb25zZTogQXV0aG9yaXphdGlvblJlc3BvbnNlfG51bGwgPSBudWxsO1xuICAgICAgbGV0IGF1dGhvcml6YXRpb25FcnJvcjogQXV0aG9yaXphdGlvbkVycm9yfG51bGwgPSBudWxsO1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGxvZygnZXJyb3InKTtcbiAgICAgICAgLy8gZ2V0IGFkZGl0aW9uYWwgb3B0aW9uYWwgaW5mby5cbiAgICAgICAgY29uc3QgZXJyb3JVcmkgPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcl91cmknKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGVycm9yRGVzY3JpcHRpb24gPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcl9kZXNjcmlwdGlvbicpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgYXV0aG9yaXphdGlvbkVycm9yID0gbmV3IEF1dGhvcml6YXRpb25FcnJvcihcbiAgICAgICAgICAgIHtlcnJvcjogZXJyb3IsIGVycm9yX2Rlc2NyaXB0aW9uOiBlcnJvckRlc2NyaXB0aW9uLCBlcnJvcl91cmk6IGVycm9yVXJpLCBzdGF0ZTogc3RhdGV9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF1dGhvcml6YXRpb25SZXNwb25zZSA9IG5ldyBBdXRob3JpemF0aW9uUmVzcG9uc2Uoe2NvZGU6IGNvZGUhLCBzdGF0ZTogc3RhdGUhfSk7XG4gICAgICB9XG4gICAgICBjb25zdCBjb21wbGV0ZVJlc3BvbnNlID0ge1xuICAgICAgICByZXF1ZXN0LFxuICAgICAgICByZXNwb25zZTogYXV0aG9yaXphdGlvblJlc3BvbnNlLFxuICAgICAgICBlcnJvcjogYXV0aG9yaXphdGlvbkVycm9yXG4gICAgICB9IGFzIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2U7XG4gICAgICBlbWl0dGVyLmVtaXQoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFLCBjb21wbGV0ZVJlc3BvbnNlKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgnU3VjY2Vzc2Z1bGx5IGxvZ2dlZCBpbiB0byBNaWdodHlUZXh0LiBQbGVhc2Ugc3dpdGNoIGJhY2sgdG8gdGhlIE1pZ2h0eVRleHQgRGVza3RvcCBBcHAuIChZb3UgY2FuIHNhZmVseSBjbG9zZSB0aGlzIHdpbmRvdyknKTtcbiAgICB9O1xuXG4gICAgdHJ5e1xuICAgICAgdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2U+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCwgKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGBVbmFibGUgdG8gY3JlYXRlIEhUVFAgc2VydmVyIGF0IHBvcnQgJHt0aGlzLmh0dHBTZXJ2ZXJQb3J0fWApO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UsIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgU2VydmVySG9sZGVyLmdldCgpLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIHJlc29sdmUgcGVuZGluZyBwcm9taXNlXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCBhcyBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlKTtcbiAgICAgICAgICAgIC8vIGNvbXBsZXRlIGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAgICAgICAgdGhpcy5jb21wbGV0ZUF1dGhvcml6YXRpb25SZXF1ZXN0SWZQb3NzaWJsZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgIHJlamVjdChgW01UIEFQUCBBVVRIXSBVbmFibGUgdG8gc2V0dXAgbGlzdGVuZXJzIG9uIHRoZSBlbWl0dGVyYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICBsb2coYFtNVCBBUFAgQVVUSF0gVW5hYmxlIHRvIGluaXRpYWxpemUgYXV0aG9yaXphdGlvblByb21pc2UhYCwgZSk7XG4gICAgfVxuXG4gICAgLy8gbGV0IHNlcnZlcjogSHR0cC5TZXJ2ZXI7XG4gICAgcmVxdWVzdC5zZXR1cENvZGVWZXJpZmllcigpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIgPSBIdHRwLmNyZWF0ZVNlcnZlcihyZXF1ZXN0SGFuZGxlcik7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIubGlzdGVuKHRoaXMuaHR0cFNlcnZlclBvcnQpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIDIwMTkxMjE5LlMuSS4gLSBUaGUgY3JlYXRlU2VydmVyIG1ldGhvZCB3aWxsIGNyZWF0ZSBhIG5ldyBodHRwIHNlcnZlciBsaXN0ZW5pbmcgb24gdGhlIHBvcnQgc3BlY2lmaWVkIGlmIG9uZVxuICAgICAgICAgICAgYSBzZXJ2ZXIgaXMgbm90IGFscmVhZHkgcnVubmluZy4gSWYgb25lIGlzIHJ1bm5pbmcgaXQgd2lsbCBqdXN0IHJlbW92ZSBhbnkgZXhpc3RpbmcgcmVxdWVzdExpc3RlbmVycyBhbmQgYWRkXG4gICAgICAgICAgICBhIG5ldyBvbmUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFNlcnZlckhvbGRlci5nZXQoKS5jcmVhdGVTZXJ2ZXIodGhpcy5odHRwU2VydmVyUG9ydCwgcmVxdWVzdEhhbmRsZXIpO1xuICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICBsb2coYFtNVCBBUFAgQVVUSF1bRVJST1JdIFVuYWJsZSB0byBzZXR1cCBzZXJ2ZXJzYCwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRSZXF1ZXN0VXJsKGNvbmZpZ3VyYXRpb24sIHJlcXVlc3QpO1xuICAgICAgICAgIGNvbnN0IHVybCA9IGBodHRwczovL21pZ2h0eXRleHQubmV0YDtcbiAgICAgICAgICBsb2coYFtNVCBBUFAgQVVUSF0gTWFraW5nIGEgcmVxdWVzdCB0bzogXCIke3VybH1cImApO1xuICAgICAgICAgIGNvbnN0IHdpbmRvd1Byb2Nlc3MgPSBvcGVuZXIodXJsKTtcbiAgICAgICAgICAvLyBleGVjKGBvcGVuICcke3VybH0nYCwgKGVycjogYW55LCBzdGRvdXQ6IHN0cmluZywgc3RkZXJyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAvLyAgIGlmKGVycil7XG4gICAgICAgICAgLy8gICAgIGxvZyhgW01UIEFQUCBBVVRIXSBlcnJvcjpgLCBlcnIpO1xuICAgICAgICAgIC8vICAgfSBlbHNlIGlmIChzdGRlcnIpe1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0gZXJyb3Igb3V0cHV0OmAsIHN0ZGVycik7XG4gICAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0gb3V0cHV0OmAsIHN0ZG91dCk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgLy8gb3BlbmVyKHVybCk7XG4gICAgICAgICAgLy8gbG9nKGBbTVQgQVBQIEFVVEhdIFdpbmRvdyByZXR1cm5lZCBieSBvcGVuZXIgbWV0aG9kOmAsIHdpbmRvd1Byb2Nlc3MpO1xuICAgICAgICAgIC8vIGxvZyhgW01UIEFQUCBBVVRIXSB3aW5kb3cgcHJvY2VzcyBraWxsZWQ/YCk7XG4gICAgICAgICAgLy8gc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgIC8vICAgdHJ5e1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0ga2lsbGluZyB0aGUgcHJvY2VzcyFgKTtcbiAgICAgICAgICAvLyAgICAgd2luZG93UHJvY2Vzcy5raWxsKCk7XG4gICAgICAgICAgLy8gICAgIGxvZyhgW01UIEFQUCBBVVRIXSBwcm9jZXNzIGtpbGxlZD9gLCB3aW5kb3dQcm9jZXNzLmtpbGxlZCk7XG4gICAgICAgICAgLy8gICB9IGNhdGNoKGUpe1xuICAgICAgICAgIC8vICAgICBsb2coYFtNVCBBUFAgQVVUSF0gRXJyb3Igb2NjdXJyZWQgYWJvcnRpbmcgcHJvY2Vzc2AsIGUpO1xuICAgICAgICAgIC8vICAgfVxuICAgICAgICAgIC8vIH0sIDUwMDApO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgbG9nKCdTb21ldGhpbmcgYmFkIGhhcHBlbmVkICcsIGVycm9yKTtcbiAgICAgICAgICBlbWl0dGVyLmVtaXQoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9VTkFCTEVfVE9fU1RBUlQpO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21wbGV0ZUF1dGhvcml6YXRpb25SZXF1ZXN0KCk6IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZXxudWxsPiB7XG4gICAgaWYgKCF0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXG4gICAgICAgICAgJ05vIHBlbmRpbmcgYXV0aG9yaXphdGlvbiByZXF1ZXN0LiBDYWxsIHBlcmZvcm1BdXRob3JpemF0aW9uUmVxdWVzdCgpID8nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZTtcbiAgfVxufVxuIl19