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
var opener = require("opener");
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
            var windowProcess = opener(url, {}, function (e) {
                logger_1.log("[MT APP AUTH] Window opened callback triggered! argument returned in callback", e);
            });
            // opener(url);
            logger_1.log("[MT APP AUTH] Window returned by opener method:", windowProcess);
            setTimeout(function () {
                try {
                    logger_1.log("[MT APP AUTH] killing the process!");
                    windowProcess.kill();
                    logger_1.log("[MT APP AUTH] process killed?", windowProcess.killed);
                }
                catch (e) {
                    logger_1.log("[MT APP AUTH] Error occurred aborting process", e);
                }
            }, 5000);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUV2Qyx5QkFBMkI7QUFFM0Isa0ZBQTJHO0FBQzNHLG9FQUFvRjtBQUdwRixvQ0FBOEI7QUFDOUIsNERBQThFO0FBQzlFLCtDQUEwQztBQUUxQyxpRkFBaUY7QUFDakYsK0JBQWtDO0FBQ2xDLG1DQUFzQztBQUV0QztJQUFrQyx1Q0FBWTtJQUE5Qzs7SUFHQSxDQUFDO0lBRlEsc0NBQWtCLEdBQUcsaUJBQWlCLENBQUM7SUFDdkMsNkNBQXlCLEdBQUcsd0JBQXdCLENBQUM7SUFDOUQsMEJBQUM7Q0FBQSxBQUhELENBQWtDLFlBQVksR0FHN0M7QUFFRDtJQUFzQyxvQ0FBMkI7SUFJL0Q7SUFDSSx1QkFBdUI7SUFDaEIsY0FBcUIsRUFDNUIsS0FBcUQsRUFDckQsTUFBaUM7UUFGMUIsK0JBQUEsRUFBQSxxQkFBcUI7UUFDNUIsc0JBQUEsRUFBQSxZQUE4QiwwQ0FBcUIsRUFBRTtRQUNyRCx1QkFBQSxFQUFBLGFBQXFCLHlCQUFVLEVBQUU7UUFKckMsWUFLRSxrQkFBTSxLQUFLLEVBQUUsTUFBTSxDQUFDLFNBQ3JCO1FBSlUsb0JBQWMsR0FBZCxjQUFjLENBQU87UUFMaEMsa0RBQWtEO1FBQ2xELDBCQUFvQixHQUFvRCxJQUFJLENBQUM7O0lBUTdFLENBQUM7SUFFRCxzREFBMkIsR0FBM0IsVUFDSSxhQUFnRCxFQUNoRCxPQUE2QjtRQUZqQyxpQkF3R0M7UUFyR0MsdUVBQXVFO1FBQ3ZFLDJEQUEyRDtRQUMzRCxJQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFFMUMsSUFBTSxjQUFjLEdBQUcsVUFBQyxXQUFpQyxFQUFFLFFBQTZCO1lB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QUM7YUFDRCxLQUFLLENBQUMsVUFBQyxLQUFLO1lBQ1gsWUFBRyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN2RCxDQUFDLENBQUMsQ0FBQztJQUNULENBQUM7SUFFUyx1REFBNEIsR0FBdEM7UUFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQzlCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FDakIsd0VBQXdFLENBQUMsQ0FBQztTQUMvRTtRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ25DLENBQUM7SUFDSCx1QkFBQztBQUFELENBQUMsQUE5SEQsQ0FBc0MsMkRBQTJCLEdBOEhoRTtBQTlIWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdFxuICogaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZVxuICogTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXJcbiAqIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0ICogYXMgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBIdHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQge0F1dGhvcml6YXRpb25SZXF1ZXN0fSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3QnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdEhhbmRsZXIsIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2V9IGZyb20gJy4uL2F1dGhvcml6YXRpb25fcmVxdWVzdF9oYW5kbGVyJztcbmltcG9ydCB7QXV0aG9yaXphdGlvbkVycm9yLCBBdXRob3JpemF0aW9uUmVzcG9uc2V9IGZyb20gJy4uL2F1dGhvcml6YXRpb25fcmVzcG9uc2UnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uU2VydmljZUNvbmZpZ3VyYXRpb259IGZyb20gJy4uL2F1dGhvcml6YXRpb25fc2VydmljZV9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7Q3J5cHRvfSBmcm9tICcuLi9jcnlwdG9fdXRpbHMnO1xuaW1wb3J0IHtsb2d9IGZyb20gJy4uL2xvZ2dlcic7XG5pbXBvcnQge0Jhc2ljUXVlcnlTdHJpbmdVdGlscywgUXVlcnlTdHJpbmdVdGlsc30gZnJvbSAnLi4vcXVlcnlfc3RyaW5nX3V0aWxzJztcbmltcG9ydCB7Tm9kZUNyeXB0b30gZnJvbSAnLi9jcnlwdG9fdXRpbHMnO1xuXG4vLyBUeXBlU2NyaXB0IHR5cGluZ3MgZm9yIGBvcGVuZXJgIGFyZSBub3QgY29ycmVjdCBhbmQgZG8gbm90IGV4cG9ydCBpdCBhcyBtb2R1bGVcbmltcG9ydCBvcGVuZXIgPSByZXF1aXJlKCdvcGVuZXInKTtcbmltcG9ydCB7U2VydmVySG9sZGVyfSBmcm9tIFwiLi9TZXJ2ZXJcIjtcblxuY2xhc3MgU2VydmVyRXZlbnRzRW1pdHRlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHN0YXRpYyBPTl9VTkFCTEVfVE9fU1RBUlQgPSAndW5hYmxlX3RvX3N0YXJ0JztcbiAgc3RhdGljIE9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UgPSAnYXV0aG9yaXphdGlvbl9yZXNwb25zZSc7XG59XG5cbmV4cG9ydCBjbGFzcyBOb2RlQmFzZWRIYW5kbGVyIGV4dGVuZHMgQXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyIHtcbiAgLy8gdGhlIGhhbmRsZSB0byB0aGUgY3VycmVudCBhdXRob3JpemF0aW9uIHJlcXVlc3RcbiAgYXV0aG9yaXphdGlvblByb21pc2U6IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZXxudWxsPnxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8vIGRlZmF1bHQgdG8gcG9ydCA4MDAwXG4gICAgICBwdWJsaWMgaHR0cFNlcnZlclBvcnQgPSA4MDAwLFxuICAgICAgdXRpbHM6IFF1ZXJ5U3RyaW5nVXRpbHMgPSBuZXcgQmFzaWNRdWVyeVN0cmluZ1V0aWxzKCksXG4gICAgICBjcnlwdG86IENyeXB0byA9IG5ldyBOb2RlQ3J5cHRvKCkpIHtcbiAgICBzdXBlcih1dGlscywgY3J5cHRvKTtcbiAgfVxuXG4gIHBlcmZvcm1BdXRob3JpemF0aW9uUmVxdWVzdChcbiAgICAgIGNvbmZpZ3VyYXRpb246IEF1dGhvcml6YXRpb25TZXJ2aWNlQ29uZmlndXJhdGlvbixcbiAgICAgIHJlcXVlc3Q6IEF1dGhvcml6YXRpb25SZXF1ZXN0KSB7XG4gICAgLy8gdXNlIG9wZW5lciB0byBsYXVuY2ggYSB3ZWIgYnJvd3NlciBhbmQgc3RhcnQgdGhlIGF1dGhvcml6YXRpb24gZmxvdy5cbiAgICAvLyBzdGFydCBhIHdlYiBzZXJ2ZXIgdG8gaGFuZGxlIHRoZSBhdXRob3JpemF0aW9uIHJlc3BvbnNlLlxuICAgIGNvbnN0IGVtaXR0ZXIgPSBuZXcgU2VydmVyRXZlbnRzRW1pdHRlcigpO1xuXG4gICAgY29uc3QgcmVxdWVzdEhhbmRsZXIgPSAoaHR0cFJlcXVlc3Q6IEh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXNwb25zZTogSHR0cC5TZXJ2ZXJSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKCFodHRwUmVxdWVzdC51cmwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB1cmwgPSBVcmwucGFyc2UoaHR0cFJlcXVlc3QudXJsKTtcbiAgICAgIGNvbnN0IHNlYXJjaFBhcmFtcyA9IG5ldyBVcmwuVVJMU2VhcmNoUGFyYW1zKHVybC5xdWVyeSB8fCAnJyk7XG5cbiAgICAgIGNvbnN0IHN0YXRlID0gc2VhcmNoUGFyYW1zLmdldCgnc3RhdGUnKSB8fCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBjb2RlID0gc2VhcmNoUGFyYW1zLmdldCgnY29kZScpO1xuICAgICAgY29uc3QgZXJyb3IgPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcicpO1xuXG4gICAgICBpZiAoIXN0YXRlICYmICFjb2RlICYmICFlcnJvcikge1xuICAgICAgICAvLyBpZ25vcmUgaXJyZWxldmFudCByZXF1ZXN0cyAoZS5nLiBmYXZpY29uLmljbylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2coJ0hhbmRsaW5nIEF1dGhvcml6YXRpb24gUmVxdWVzdCAnLCBzZWFyY2hQYXJhbXMsIHN0YXRlLCBjb2RlLCBlcnJvcik7XG4gICAgICBsZXQgYXV0aG9yaXphdGlvblJlc3BvbnNlOiBBdXRob3JpemF0aW9uUmVzcG9uc2V8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgYXV0aG9yaXphdGlvbkVycm9yOiBBdXRob3JpemF0aW9uRXJyb3J8bnVsbCA9IG51bGw7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgbG9nKCdlcnJvcicpO1xuICAgICAgICAvLyBnZXQgYWRkaXRpb25hbCBvcHRpb25hbCBpbmZvLlxuICAgICAgICBjb25zdCBlcnJvclVyaSA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yX3VyaScpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXJyb3JEZXNjcmlwdGlvbiA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yX2Rlc2NyaXB0aW9uJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBhdXRob3JpemF0aW9uRXJyb3IgPSBuZXcgQXV0aG9yaXphdGlvbkVycm9yKFxuICAgICAgICAgICAge2Vycm9yOiBlcnJvciwgZXJyb3JfZGVzY3JpcHRpb246IGVycm9yRGVzY3JpcHRpb24sIGVycm9yX3VyaTogZXJyb3JVcmksIHN0YXRlOiBzdGF0ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXV0aG9yaXphdGlvblJlc3BvbnNlID0gbmV3IEF1dGhvcml6YXRpb25SZXNwb25zZSh7Y29kZTogY29kZSEsIHN0YXRlOiBzdGF0ZSF9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbXBsZXRlUmVzcG9uc2UgPSB7XG4gICAgICAgIHJlcXVlc3QsXG4gICAgICAgIHJlc3BvbnNlOiBhdXRob3JpemF0aW9uUmVzcG9uc2UsXG4gICAgICAgIGVycm9yOiBhdXRob3JpemF0aW9uRXJyb3JcbiAgICAgIH0gYXMgQXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZTtcbiAgICAgIGVtaXR0ZXIuZW1pdChTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UsIGNvbXBsZXRlUmVzcG9uc2UpO1xuICAgICAgcmVzcG9uc2UuZW5kKCdTdWNjZXNzZnVsbHkgbG9nZ2VkIGluIHRvIE1pZ2h0eVRleHQuIFBsZWFzZSBzd2l0Y2ggYmFjayB0byB0aGUgTWlnaHR5VGV4dCBEZXNrdG9wIEFwcC4gKFlvdSBjYW4gc2FmZWx5IGNsb3NlIHRoaXMgd2luZG93KScpO1xuICAgIH07XG5cbiAgICB0cnl7XG4gICAgICB0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlID0gbmV3IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgZW1pdHRlci5vbmNlKFNlcnZlckV2ZW50c0VtaXR0ZXIuT05fVU5BQkxFX1RPX1NUQVJULCAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoYFVuYWJsZSB0byBjcmVhdGUgSFRUUCBzZXJ2ZXIgYXQgcG9ydCAke3RoaXMuaHR0cFNlcnZlclBvcnR9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZW1pdHRlci5vbmNlKFNlcnZlckV2ZW50c0VtaXR0ZXIuT05fQVVUSE9SSVpBVElPTl9SRVNQT05TRSwgKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICBTZXJ2ZXJIb2xkZXIuZ2V0KCkuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIHNlcnZlci5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gcmVzb2x2ZSBwZW5kaW5nIHByb21pc2VcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0IGFzIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2UpO1xuICAgICAgICAgICAgLy8gY29tcGxldGUgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlQXV0aG9yaXphdGlvblJlcXVlc3RJZlBvc3NpYmxlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgcmVqZWN0KGBbTVQgQVBQIEFVVEhdIFVuYWJsZSB0byBzZXR1cCBsaXN0ZW5lcnMgb24gdGhlIGVtaXR0ZXJgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBVbmFibGUgdG8gaW5pdGlhbGl6ZSBhdXRob3JpemF0aW9uUHJvbWlzZSFgLCBlKTtcbiAgICB9XG5cbiAgICAvLyBsZXQgc2VydmVyOiBIdHRwLlNlcnZlcjtcbiAgICByZXF1ZXN0LnNldHVwQ29kZVZlcmlmaWVyKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgIC8vIHNlcnZlciA9IEh0dHAuY3JlYXRlU2VydmVyKHJlcXVlc3RIYW5kbGVyKTtcbiAgICAgICAgICAgIC8vIHNlcnZlci5saXN0ZW4odGhpcy5odHRwU2VydmVyUG9ydCk7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgMjAxOTEyMTkuUy5JLiAtIFRoZSBjcmVhdGVTZXJ2ZXIgbWV0aG9kIHdpbGwgY3JlYXRlIGEgbmV3IGh0dHAgc2VydmVyIGxpc3RlbmluZyBvbiB0aGUgcG9ydCBzcGVjaWZpZWQgaWYgb25lXG4gICAgICAgICAgICBhIHNlcnZlciBpcyBub3QgYWxyZWFkeSBydW5uaW5nLiBJZiBvbmUgaXMgcnVubmluZyBpdCB3aWxsIGp1c3QgcmVtb3ZlIGFueSBleGlzdGluZyByZXF1ZXN0TGlzdGVuZXJzIGFuZCBhZGRcbiAgICAgICAgICAgIGEgbmV3IG9uZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgU2VydmVySG9sZGVyLmdldCgpLmNyZWF0ZVNlcnZlcih0aGlzLmh0dHBTZXJ2ZXJQb3J0LCByZXF1ZXN0SGFuZGxlcik7XG4gICAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXVtFUlJPUl0gVW5hYmxlIHRvIHNldHVwIHNlcnZlcnNgLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFJlcXVlc3RVcmwoY29uZmlndXJhdGlvbiwgcmVxdWVzdCk7XG4gICAgICAgICAgbG9nKCdNYWtpbmcgYSByZXF1ZXN0IHRvICcsIHJlcXVlc3QsIHVybCk7XG4gICAgICAgICAgY29uc3Qgd2luZG93UHJvY2VzcyA9IG9wZW5lcih1cmwse30sIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIFdpbmRvdyBvcGVuZWQgY2FsbGJhY2sgdHJpZ2dlcmVkISBhcmd1bWVudCByZXR1cm5lZCBpbiBjYWxsYmFja2AsIGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIG9wZW5lcih1cmwpO1xuICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBXaW5kb3cgcmV0dXJuZWQgYnkgb3BlbmVyIG1ldGhvZDpgLCB3aW5kb3dQcm9jZXNzKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBraWxsaW5nIHRoZSBwcm9jZXNzIWApO1xuICAgICAgICAgICAgICB3aW5kb3dQcm9jZXNzLmtpbGwoKTtcbiAgICAgICAgICAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIHByb2Nlc3Mga2lsbGVkP2AsIHdpbmRvd1Byb2Nlc3Mua2lsbGVkKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBFcnJvciBvY2N1cnJlZCBhYm9ydGluZyBwcm9jZXNzYCwgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgNTAwMCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBsb2coJ1NvbWV0aGluZyBiYWQgaGFwcGVuZWQgJywgZXJyb3IpO1xuICAgICAgICAgIGVtaXR0ZXIuZW1pdChTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBsZXRlQXV0aG9yaXphdGlvblJlcXVlc3QoKTogUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfG51bGw+IHtcbiAgICBpZiAoIXRoaXMuYXV0aG9yaXphdGlvblByb21pc2UpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgICAnTm8gcGVuZGluZyBhdXRob3JpemF0aW9uIHJlcXVlc3QuIENhbGwgcGVyZm9ybUF1dGhvcml6YXRpb25SZXF1ZXN0KCkgPycpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlO1xuICB9XG59XG4iXX0=