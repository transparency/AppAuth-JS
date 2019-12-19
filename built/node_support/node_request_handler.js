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
var Http = require("http");
var Url = require("url");
var authorization_request_handler_1 = require("../authorization_request_handler");
var authorization_response_1 = require("../authorization_response");
var logger_1 = require("../logger");
var query_string_utils_1 = require("../query_string_utils");
var crypto_utils_1 = require("./crypto_utils");
// TypeScript typings for `opener` are not correct and do not export it as module
var opener = require("opener");
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
        this.authorizationPromise = new Promise(function (resolve, reject) {
            emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, function () {
                reject("Unable to create HTTP server at port " + _this.httpServerPort);
            });
            emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, function (result) {
                server.close();
                // resolve pending promise
                resolve(result);
                // complete authorization flow
                _this.completeAuthorizationRequestIfPossible();
            });
        });
        var server;
        request.setupCodeVerifier()
            .then(function () {
            try {
                server = Http.createServer(requestHandler);
                server.listen(_this.httpServerPort);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUN2QywyQkFBNkI7QUFDN0IseUJBQTJCO0FBRTNCLGtGQUEyRztBQUMzRyxvRUFBb0Y7QUFHcEYsb0NBQThCO0FBQzlCLDREQUE4RTtBQUM5RSwrQ0FBMEM7QUFHMUMsaUZBQWlGO0FBQ2pGLCtCQUFrQztBQUVsQztJQUFrQyx1Q0FBWTtJQUE5Qzs7SUFHQSxDQUFDO0lBRlEsc0NBQWtCLEdBQUcsaUJBQWlCLENBQUM7SUFDdkMsNkNBQXlCLEdBQUcsd0JBQXdCLENBQUM7SUFDOUQsMEJBQUM7Q0FBQSxBQUhELENBQWtDLFlBQVksR0FHN0M7QUFFRDtJQUFzQyxvQ0FBMkI7SUFJL0Q7SUFDSSx1QkFBdUI7SUFDaEIsY0FBcUIsRUFDNUIsS0FBcUQsRUFDckQsTUFBaUM7UUFGMUIsK0JBQUEsRUFBQSxxQkFBcUI7UUFDNUIsc0JBQUEsRUFBQSxZQUE4QiwwQ0FBcUIsRUFBRTtRQUNyRCx1QkFBQSxFQUFBLGFBQXFCLHlCQUFVLEVBQUU7UUFKckMsWUFLRSxrQkFBTSxLQUFLLEVBQUUsTUFBTSxDQUFDLFNBQ3JCO1FBSlUsb0JBQWMsR0FBZCxjQUFjLENBQU87UUFMaEMsa0RBQWtEO1FBQ2xELDBCQUFvQixHQUFvRCxJQUFJLENBQUM7O0lBUTdFLENBQUM7SUFFRCxzREFBMkIsR0FBM0IsVUFDSSxhQUFnRCxFQUNoRCxPQUE2QjtRQUZqQyxpQkF5RkM7UUF0RkMsdUVBQXVFO1FBQ3ZFLDJEQUEyRDtRQUMzRCxJQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFFMUMsSUFBTSxjQUFjLEdBQUcsVUFBQyxXQUFpQyxFQUFFLFFBQTZCO1lB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QixFQUFFO1lBQzlCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FDakIsd0VBQXdFLENBQUMsQ0FBQztTQUMvRTtRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ25DLENBQUM7SUFDSCx1QkFBQztBQUFELENBQUMsQUEvR0QsQ0FBc0MsMkRBQTJCLEdBK0doRTtBQS9HWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdFxuICogaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZVxuICogTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXJcbiAqIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0ICogYXMgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBIdHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQge0F1dGhvcml6YXRpb25SZXF1ZXN0fSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3QnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdEhhbmRsZXIsIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2V9IGZyb20gJy4uL2F1dGhvcml6YXRpb25fcmVxdWVzdF9oYW5kbGVyJztcbmltcG9ydCB7QXV0aG9yaXphdGlvbkVycm9yLCBBdXRob3JpemF0aW9uUmVzcG9uc2V9IGZyb20gJy4uL2F1dGhvcml6YXRpb25fcmVzcG9uc2UnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uU2VydmljZUNvbmZpZ3VyYXRpb259IGZyb20gJy4uL2F1dGhvcml6YXRpb25fc2VydmljZV9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7Q3J5cHRvfSBmcm9tICcuLi9jcnlwdG9fdXRpbHMnO1xuaW1wb3J0IHtsb2d9IGZyb20gJy4uL2xvZ2dlcic7XG5pbXBvcnQge0Jhc2ljUXVlcnlTdHJpbmdVdGlscywgUXVlcnlTdHJpbmdVdGlsc30gZnJvbSAnLi4vcXVlcnlfc3RyaW5nX3V0aWxzJztcbmltcG9ydCB7Tm9kZUNyeXB0b30gZnJvbSAnLi9jcnlwdG9fdXRpbHMnO1xuXG5cbi8vIFR5cGVTY3JpcHQgdHlwaW5ncyBmb3IgYG9wZW5lcmAgYXJlIG5vdCBjb3JyZWN0IGFuZCBkbyBub3QgZXhwb3J0IGl0IGFzIG1vZHVsZVxuaW1wb3J0IG9wZW5lciA9IHJlcXVpcmUoJ29wZW5lcicpO1xuXG5jbGFzcyBTZXJ2ZXJFdmVudHNFbWl0dGVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgc3RhdGljIE9OX1VOQUJMRV9UT19TVEFSVCA9ICd1bmFibGVfdG9fc3RhcnQnO1xuICBzdGF0aWMgT05fQVVUSE9SSVpBVElPTl9SRVNQT05TRSA9ICdhdXRob3JpemF0aW9uX3Jlc3BvbnNlJztcbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVCYXNlZEhhbmRsZXIgZXh0ZW5kcyBBdXRob3JpemF0aW9uUmVxdWVzdEhhbmRsZXIge1xuICAvLyB0aGUgaGFuZGxlIHRvIHRoZSBjdXJyZW50IGF1dGhvcml6YXRpb24gcmVxdWVzdFxuICBhdXRob3JpemF0aW9uUHJvbWlzZTogUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfG51bGw+fG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLy8gZGVmYXVsdCB0byBwb3J0IDgwMDBcbiAgICAgIHB1YmxpYyBodHRwU2VydmVyUG9ydCA9IDgwMDAsXG4gICAgICB1dGlsczogUXVlcnlTdHJpbmdVdGlscyA9IG5ldyBCYXNpY1F1ZXJ5U3RyaW5nVXRpbHMoKSxcbiAgICAgIGNyeXB0bzogQ3J5cHRvID0gbmV3IE5vZGVDcnlwdG8oKSkge1xuICAgIHN1cGVyKHV0aWxzLCBjcnlwdG8pO1xuICB9XG5cbiAgcGVyZm9ybUF1dGhvcml6YXRpb25SZXF1ZXN0KFxuICAgICAgY29uZmlndXJhdGlvbjogQXV0aG9yaXphdGlvblNlcnZpY2VDb25maWd1cmF0aW9uLFxuICAgICAgcmVxdWVzdDogQXV0aG9yaXphdGlvblJlcXVlc3QpIHtcbiAgICAvLyB1c2Ugb3BlbmVyIHRvIGxhdW5jaCBhIHdlYiBicm93c2VyIGFuZCBzdGFydCB0aGUgYXV0aG9yaXphdGlvbiBmbG93LlxuICAgIC8vIHN0YXJ0IGEgd2ViIHNlcnZlciB0byBoYW5kbGUgdGhlIGF1dGhvcml6YXRpb24gcmVzcG9uc2UuXG4gICAgY29uc3QgZW1pdHRlciA9IG5ldyBTZXJ2ZXJFdmVudHNFbWl0dGVyKCk7XG5cbiAgICBjb25zdCByZXF1ZXN0SGFuZGxlciA9IChodHRwUmVxdWVzdDogSHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlc3BvbnNlOiBIdHRwLlNlcnZlclJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAoIWh0dHBSZXF1ZXN0LnVybCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVybCA9IFVybC5wYXJzZShodHRwUmVxdWVzdC51cmwpO1xuICAgICAgY29uc3Qgc2VhcmNoUGFyYW1zID0gbmV3IFVybC5VUkxTZWFyY2hQYXJhbXModXJsLnF1ZXJ5IHx8ICcnKTtcblxuICAgICAgY29uc3Qgc3RhdGUgPSBzZWFyY2hQYXJhbXMuZ2V0KCdzdGF0ZScpIHx8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGNvZGUgPSBzZWFyY2hQYXJhbXMuZ2V0KCdjb2RlJyk7XG4gICAgICBjb25zdCBlcnJvciA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yJyk7XG5cbiAgICAgIGlmICghc3RhdGUgJiYgIWNvZGUgJiYgIWVycm9yKSB7XG4gICAgICAgIC8vIGlnbm9yZSBpcnJlbGV2YW50IHJlcXVlc3RzIChlLmcuIGZhdmljb24uaWNvKVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvZygnSGFuZGxpbmcgQXV0aG9yaXphdGlvbiBSZXF1ZXN0ICcsIHNlYXJjaFBhcmFtcywgc3RhdGUsIGNvZGUsIGVycm9yKTtcbiAgICAgIGxldCBhdXRob3JpemF0aW9uUmVzcG9uc2U6IEF1dGhvcml6YXRpb25SZXNwb25zZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCBhdXRob3JpemF0aW9uRXJyb3I6IEF1dGhvcml6YXRpb25FcnJvcnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBsb2coJ2Vycm9yJyk7XG4gICAgICAgIC8vIGdldCBhZGRpdGlvbmFsIG9wdGlvbmFsIGluZm8uXG4gICAgICAgIGNvbnN0IGVycm9yVXJpID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3JfdXJpJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBlcnJvckRlc2NyaXB0aW9uID0gc2VhcmNoUGFyYW1zLmdldCgnZXJyb3JfZGVzY3JpcHRpb24nKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGF1dGhvcml6YXRpb25FcnJvciA9IG5ldyBBdXRob3JpemF0aW9uRXJyb3IoXG4gICAgICAgICAgICB7ZXJyb3I6IGVycm9yLCBlcnJvcl9kZXNjcmlwdGlvbjogZXJyb3JEZXNjcmlwdGlvbiwgZXJyb3JfdXJpOiBlcnJvclVyaSwgc3RhdGU6IHN0YXRlfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdXRob3JpemF0aW9uUmVzcG9uc2UgPSBuZXcgQXV0aG9yaXphdGlvblJlc3BvbnNlKHtjb2RlOiBjb2RlISwgc3RhdGU6IHN0YXRlIX0pO1xuICAgICAgfVxuICAgICAgY29uc3QgY29tcGxldGVSZXNwb25zZSA9IHtcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgcmVzcG9uc2U6IGF1dGhvcml6YXRpb25SZXNwb25zZSxcbiAgICAgICAgZXJyb3I6IGF1dGhvcml6YXRpb25FcnJvclxuICAgICAgfSBhcyBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlO1xuICAgICAgZW1pdHRlci5lbWl0KFNlcnZlckV2ZW50c0VtaXR0ZXIuT05fQVVUSE9SSVpBVElPTl9SRVNQT05TRSwgY29tcGxldGVSZXNwb25zZSk7XG4gICAgICByZXNwb25zZS5lbmQoJ1N1Y2Nlc3NmdWxseSBsb2dnZWQgaW4gdG8gTWlnaHR5VGV4dC4gUGxlYXNlIHN3aXRjaCBiYWNrIHRvIHRoZSBNaWdodHlUZXh0IERlc2t0b3AgQXBwLiAoWW91IGNhbiBzYWZlbHkgY2xvc2UgdGhpcyB3aW5kb3cpJyk7XG4gICAgfTtcblxuICAgIHRoaXMuYXV0aG9yaXphdGlvblByb21pc2UgPSBuZXcgUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBlbWl0dGVyLm9uY2UoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9VTkFCTEVfVE9fU1RBUlQsICgpID0+IHtcbiAgICAgICAgcmVqZWN0KGBVbmFibGUgdG8gY3JlYXRlIEhUVFAgc2VydmVyIGF0IHBvcnQgJHt0aGlzLmh0dHBTZXJ2ZXJQb3J0fWApO1xuICAgICAgfSk7XG4gICAgICBlbWl0dGVyLm9uY2UoU2VydmVyRXZlbnRzRW1pdHRlci5PTl9BVVRIT1JJWkFUSU9OX1JFU1BPTlNFLCAocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgc2VydmVyLmNsb3NlKCk7XG4gICAgICAgIC8vIHJlc29sdmUgcGVuZGluZyBwcm9taXNlXG4gICAgICAgIHJlc29sdmUocmVzdWx0IGFzIEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2UpO1xuICAgICAgICAvLyBjb21wbGV0ZSBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgICAgdGhpcy5jb21wbGV0ZUF1dGhvcml6YXRpb25SZXF1ZXN0SWZQb3NzaWJsZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBsZXQgc2VydmVyOiBIdHRwLlNlcnZlcjtcbiAgICByZXF1ZXN0LnNldHVwQ29kZVZlcmlmaWVyKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlcnZlciA9IEh0dHAuY3JlYXRlU2VydmVyKHJlcXVlc3RIYW5kbGVyKTtcbiAgICAgICAgICAgIHNlcnZlci5saXN0ZW4odGhpcy5odHRwU2VydmVyUG9ydCk7XG4gICAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXVtFUlJPUl0gVW5hYmxlIHRvIHNldHVwIHNlcnZlcnNgLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFJlcXVlc3RVcmwoY29uZmlndXJhdGlvbiwgcmVxdWVzdCk7XG4gICAgICAgICAgbG9nKCdNYWtpbmcgYSByZXF1ZXN0IHRvICcsIHJlcXVlc3QsIHVybCk7XG4gICAgICAgICAgY29uc3Qgd2luZG93UHJvY2VzcyA9IG9wZW5lcih1cmwse30sIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIFdpbmRvdyBvcGVuZWQgY2FsbGJhY2sgdHJpZ2dlcmVkISBhcmd1bWVudCByZXR1cm5lZCBpbiBjYWxsYmFja2AsIGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIG9wZW5lcih1cmwpO1xuICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBXaW5kb3cgcmV0dXJuZWQgYnkgb3BlbmVyIG1ldGhvZDpgLCB3aW5kb3dQcm9jZXNzKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBraWxsaW5nIHRoZSBwcm9jZXNzIWApO1xuICAgICAgICAgICAgICB3aW5kb3dQcm9jZXNzLmtpbGwoKTtcbiAgICAgICAgICAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIHByb2Nlc3Mga2lsbGVkP2AsIHdpbmRvd1Byb2Nlc3Mua2lsbGVkKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBFcnJvciBvY2N1cnJlZCBhYm9ydGluZyBwcm9jZXNzYCwgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgNTAwMCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBsb2coJ1NvbWV0aGluZyBiYWQgaGFwcGVuZWQgJywgZXJyb3IpO1xuICAgICAgICAgIGVtaXR0ZXIuZW1pdChTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBsZXRlQXV0aG9yaXphdGlvblJlcXVlc3QoKTogUHJvbWlzZTxBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfG51bGw+IHtcbiAgICBpZiAoIXRoaXMuYXV0aG9yaXphdGlvblByb21pc2UpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgICAnTm8gcGVuZGluZyBhdXRob3JpemF0aW9uIHJlcXVlc3QuIENhbGwgcGVyZm9ybUF1dGhvcml6YXRpb25SZXF1ZXN0KCkgPycpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmF1dGhvcml6YXRpb25Qcm9taXNlO1xuICB9XG59XG4iXX0=