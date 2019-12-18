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
            response.end('Successfully logged in to MightyText. Please switch back to the MightyText Desktop App.');
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
            server = Http.createServer(requestHandler);
            server.listen(_this.httpServerPort);
            var url = _this.buildRequestUrl(configuration, request);
            logger_1.log('Making a request to ', request, url);
            var windowProcess = opener(url, {}, function (e) {
                logger_1.log("[MT APP AUTH] Window opened callback triggered! argument returned in callback", e);
            });
            // opener(url);
            logger_1.log("[MT APP AUTH] Window returned by opener method:", windowProcess);
            setTimeout(function () {
                try {
                    windowProcess.kill();
                }
                catch (e) {
                    console.error("[MT APP AUTH] Error occured aborting process", e);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9yZXF1ZXN0X2hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZV9zdXBwb3J0L25vZGVfcmVxdWVzdF9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFDQUF1QztBQUN2QywyQkFBNkI7QUFDN0IseUJBQTJCO0FBRTNCLGtGQUEyRztBQUMzRyxvRUFBb0Y7QUFHcEYsb0NBQThCO0FBQzlCLDREQUE4RTtBQUM5RSwrQ0FBMEM7QUFHMUMsaUZBQWlGO0FBQ2pGLCtCQUFrQztBQUVsQztJQUFrQyx1Q0FBWTtJQUE5Qzs7SUFHQSxDQUFDO0lBRlEsc0NBQWtCLEdBQUcsaUJBQWlCLENBQUM7SUFDdkMsNkNBQXlCLEdBQUcsd0JBQXdCLENBQUM7SUFDOUQsMEJBQUM7Q0FBQSxBQUhELENBQWtDLFlBQVksR0FHN0M7QUFFRDtJQUFzQyxvQ0FBMkI7SUFJL0Q7SUFDSSx1QkFBdUI7SUFDaEIsY0FBcUIsRUFDNUIsS0FBcUQsRUFDckQsTUFBaUM7UUFGMUIsK0JBQUEsRUFBQSxxQkFBcUI7UUFDNUIsc0JBQUEsRUFBQSxZQUE4QiwwQ0FBcUIsRUFBRTtRQUNyRCx1QkFBQSxFQUFBLGFBQXFCLHlCQUFVLEVBQUU7UUFKckMsWUFLRSxrQkFBTSxLQUFLLEVBQUUsTUFBTSxDQUFDLFNBQ3JCO1FBSlUsb0JBQWMsR0FBZCxjQUFjLENBQU87UUFMaEMsa0RBQWtEO1FBQ2xELDBCQUFvQixHQUFvRCxJQUFJLENBQUM7O0lBUTdFLENBQUM7SUFFRCxzREFBMkIsR0FBM0IsVUFDSSxhQUFnRCxFQUNoRCxPQUE2QjtRQUZqQyxpQkFtRkM7UUFoRkMsdUVBQXVFO1FBQ3ZFLDJEQUEyRDtRQUMzRCxJQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFFMUMsSUFBTSxjQUFjLEdBQUcsVUFBQyxXQUFpQyxFQUFFLFFBQTZCO1lB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Iiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHRcbiAqIGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGVcbiAqIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyXG4gKiBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgSHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtBdXRob3JpemF0aW9uUmVxdWVzdH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbl9yZXF1ZXN0JztcbmltcG9ydCB7QXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyLCBBdXRob3JpemF0aW9uUmVxdWVzdFJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3JlcXVlc3RfaGFuZGxlcic7XG5pbXBvcnQge0F1dGhvcml6YXRpb25FcnJvciwgQXV0aG9yaXphdGlvblJlc3BvbnNlfSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3Jlc3BvbnNlJztcbmltcG9ydCB7QXV0aG9yaXphdGlvblNlcnZpY2VDb25maWd1cmF0aW9ufSBmcm9tICcuLi9hdXRob3JpemF0aW9uX3NlcnZpY2VfY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0NyeXB0b30gZnJvbSAnLi4vY3J5cHRvX3V0aWxzJztcbmltcG9ydCB7bG9nfSBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHtCYXNpY1F1ZXJ5U3RyaW5nVXRpbHMsIFF1ZXJ5U3RyaW5nVXRpbHN9IGZyb20gJy4uL3F1ZXJ5X3N0cmluZ191dGlscyc7XG5pbXBvcnQge05vZGVDcnlwdG99IGZyb20gJy4vY3J5cHRvX3V0aWxzJztcblxuXG4vLyBUeXBlU2NyaXB0IHR5cGluZ3MgZm9yIGBvcGVuZXJgIGFyZSBub3QgY29ycmVjdCBhbmQgZG8gbm90IGV4cG9ydCBpdCBhcyBtb2R1bGVcbmltcG9ydCBvcGVuZXIgPSByZXF1aXJlKCdvcGVuZXInKTtcblxuY2xhc3MgU2VydmVyRXZlbnRzRW1pdHRlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHN0YXRpYyBPTl9VTkFCTEVfVE9fU1RBUlQgPSAndW5hYmxlX3RvX3N0YXJ0JztcbiAgc3RhdGljIE9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UgPSAnYXV0aG9yaXphdGlvbl9yZXNwb25zZSc7XG59XG5cbmV4cG9ydCBjbGFzcyBOb2RlQmFzZWRIYW5kbGVyIGV4dGVuZHMgQXV0aG9yaXphdGlvblJlcXVlc3RIYW5kbGVyIHtcbiAgLy8gdGhlIGhhbmRsZSB0byB0aGUgY3VycmVudCBhdXRob3JpemF0aW9uIHJlcXVlc3RcbiAgYXV0aG9yaXphdGlvblByb21pc2U6IFByb21pc2U8QXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZXxudWxsPnxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8vIGRlZmF1bHQgdG8gcG9ydCA4MDAwXG4gICAgICBwdWJsaWMgaHR0cFNlcnZlclBvcnQgPSA4MDAwLFxuICAgICAgdXRpbHM6IFF1ZXJ5U3RyaW5nVXRpbHMgPSBuZXcgQmFzaWNRdWVyeVN0cmluZ1V0aWxzKCksXG4gICAgICBjcnlwdG86IENyeXB0byA9IG5ldyBOb2RlQ3J5cHRvKCkpIHtcbiAgICBzdXBlcih1dGlscywgY3J5cHRvKTtcbiAgfVxuXG4gIHBlcmZvcm1BdXRob3JpemF0aW9uUmVxdWVzdChcbiAgICAgIGNvbmZpZ3VyYXRpb246IEF1dGhvcml6YXRpb25TZXJ2aWNlQ29uZmlndXJhdGlvbixcbiAgICAgIHJlcXVlc3Q6IEF1dGhvcml6YXRpb25SZXF1ZXN0KSB7XG4gICAgLy8gdXNlIG9wZW5lciB0byBsYXVuY2ggYSB3ZWIgYnJvd3NlciBhbmQgc3RhcnQgdGhlIGF1dGhvcml6YXRpb24gZmxvdy5cbiAgICAvLyBzdGFydCBhIHdlYiBzZXJ2ZXIgdG8gaGFuZGxlIHRoZSBhdXRob3JpemF0aW9uIHJlc3BvbnNlLlxuICAgIGNvbnN0IGVtaXR0ZXIgPSBuZXcgU2VydmVyRXZlbnRzRW1pdHRlcigpO1xuXG4gICAgY29uc3QgcmVxdWVzdEhhbmRsZXIgPSAoaHR0cFJlcXVlc3Q6IEh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXNwb25zZTogSHR0cC5TZXJ2ZXJSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKCFodHRwUmVxdWVzdC51cmwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB1cmwgPSBVcmwucGFyc2UoaHR0cFJlcXVlc3QudXJsKTtcbiAgICAgIGNvbnN0IHNlYXJjaFBhcmFtcyA9IG5ldyBVcmwuVVJMU2VhcmNoUGFyYW1zKHVybC5xdWVyeSB8fCAnJyk7XG5cbiAgICAgIGNvbnN0IHN0YXRlID0gc2VhcmNoUGFyYW1zLmdldCgnc3RhdGUnKSB8fCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBjb2RlID0gc2VhcmNoUGFyYW1zLmdldCgnY29kZScpO1xuICAgICAgY29uc3QgZXJyb3IgPSBzZWFyY2hQYXJhbXMuZ2V0KCdlcnJvcicpO1xuXG4gICAgICBpZiAoIXN0YXRlICYmICFjb2RlICYmICFlcnJvcikge1xuICAgICAgICAvLyBpZ25vcmUgaXJyZWxldmFudCByZXF1ZXN0cyAoZS5nLiBmYXZpY29uLmljbylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2coJ0hhbmRsaW5nIEF1dGhvcml6YXRpb24gUmVxdWVzdCAnLCBzZWFyY2hQYXJhbXMsIHN0YXRlLCBjb2RlLCBlcnJvcik7XG4gICAgICBsZXQgYXV0aG9yaXphdGlvblJlc3BvbnNlOiBBdXRob3JpemF0aW9uUmVzcG9uc2V8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgYXV0aG9yaXphdGlvbkVycm9yOiBBdXRob3JpemF0aW9uRXJyb3J8bnVsbCA9IG51bGw7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgbG9nKCdlcnJvcicpO1xuICAgICAgICAvLyBnZXQgYWRkaXRpb25hbCBvcHRpb25hbCBpbmZvLlxuICAgICAgICBjb25zdCBlcnJvclVyaSA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yX3VyaScpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXJyb3JEZXNjcmlwdGlvbiA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yX2Rlc2NyaXB0aW9uJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBhdXRob3JpemF0aW9uRXJyb3IgPSBuZXcgQXV0aG9yaXphdGlvbkVycm9yKFxuICAgICAgICAgICAge2Vycm9yOiBlcnJvciwgZXJyb3JfZGVzY3JpcHRpb246IGVycm9yRGVzY3JpcHRpb24sIGVycm9yX3VyaTogZXJyb3JVcmksIHN0YXRlOiBzdGF0ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXV0aG9yaXphdGlvblJlc3BvbnNlID0gbmV3IEF1dGhvcml6YXRpb25SZXNwb25zZSh7Y29kZTogY29kZSEsIHN0YXRlOiBzdGF0ZSF9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbXBsZXRlUmVzcG9uc2UgPSB7XG4gICAgICAgIHJlcXVlc3QsXG4gICAgICAgIHJlc3BvbnNlOiBhdXRob3JpemF0aW9uUmVzcG9uc2UsXG4gICAgICAgIGVycm9yOiBhdXRob3JpemF0aW9uRXJyb3JcbiAgICAgIH0gYXMgQXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZTtcbiAgICAgIGVtaXR0ZXIuZW1pdChTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UsIGNvbXBsZXRlUmVzcG9uc2UpO1xuICAgICAgcmVzcG9uc2UuZW5kKCdTdWNjZXNzZnVsbHkgbG9nZ2VkIGluIHRvIE1pZ2h0eVRleHQuIFBsZWFzZSBzd2l0Y2ggYmFjayB0byB0aGUgTWlnaHR5VGV4dCBEZXNrdG9wIEFwcC4nKTtcbiAgICB9O1xuXG4gICAgdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZSA9IG5ldyBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2U+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX1VOQUJMRV9UT19TVEFSVCwgKCkgPT4ge1xuICAgICAgICByZWplY3QoYFVuYWJsZSB0byBjcmVhdGUgSFRUUCBzZXJ2ZXIgYXQgcG9ydCAke3RoaXMuaHR0cFNlcnZlclBvcnR9YCk7XG4gICAgICB9KTtcbiAgICAgIGVtaXR0ZXIub25jZShTZXJ2ZXJFdmVudHNFbWl0dGVyLk9OX0FVVEhPUklaQVRJT05fUkVTUE9OU0UsIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gcmVzb2x2ZSBwZW5kaW5nIHByb21pc2VcbiAgICAgICAgcmVzb2x2ZShyZXN1bHQgYXMgQXV0aG9yaXphdGlvblJlcXVlc3RSZXNwb25zZSk7XG4gICAgICAgIC8vIGNvbXBsZXRlIGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAgICB0aGlzLmNvbXBsZXRlQXV0aG9yaXphdGlvblJlcXVlc3RJZlBvc3NpYmxlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGxldCBzZXJ2ZXI6IEh0dHAuU2VydmVyO1xuICAgIHJlcXVlc3Quc2V0dXBDb2RlVmVyaWZpZXIoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgc2VydmVyID0gSHR0cC5jcmVhdGVTZXJ2ZXIocmVxdWVzdEhhbmRsZXIpO1xuICAgICAgICAgIHNlcnZlci5saXN0ZW4odGhpcy5odHRwU2VydmVyUG9ydCk7XG4gICAgICAgICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFJlcXVlc3RVcmwoY29uZmlndXJhdGlvbiwgcmVxdWVzdCk7XG4gICAgICAgICAgbG9nKCdNYWtpbmcgYSByZXF1ZXN0IHRvICcsIHJlcXVlc3QsIHVybCk7XG4gICAgICAgICAgY29uc3Qgd2luZG93UHJvY2VzcyA9IG9wZW5lcih1cmwse30sIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgbG9nKGBbTVQgQVBQIEFVVEhdIFdpbmRvdyBvcGVuZWQgY2FsbGJhY2sgdHJpZ2dlcmVkISBhcmd1bWVudCByZXR1cm5lZCBpbiBjYWxsYmFja2AsIGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIG9wZW5lcih1cmwpO1xuICAgICAgICAgIGxvZyhgW01UIEFQUCBBVVRIXSBXaW5kb3cgcmV0dXJuZWQgYnkgb3BlbmVyIG1ldGhvZDpgLCB3aW5kb3dQcm9jZXNzKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIHdpbmRvd1Byb2Nlc3Mua2lsbCgpO1xuICAgICAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW01UIEFQUCBBVVRIXSBFcnJvciBvY2N1cmVkIGFib3J0aW5nIHByb2Nlc3NgLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCA1MDAwKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIGxvZygnU29tZXRoaW5nIGJhZCBoYXBwZW5lZCAnLCBlcnJvcik7XG4gICAgICAgICAgZW1pdHRlci5lbWl0KFNlcnZlckV2ZW50c0VtaXR0ZXIuT05fVU5BQkxFX1RPX1NUQVJUKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGxldGVBdXRob3JpemF0aW9uUmVxdWVzdCgpOiBQcm9taXNlPEF1dGhvcml6YXRpb25SZXF1ZXN0UmVzcG9uc2V8bnVsbD4ge1xuICAgIGlmICghdGhpcy5hdXRob3JpemF0aW9uUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICAgICdObyBwZW5kaW5nIGF1dGhvcml6YXRpb24gcmVxdWVzdC4gQ2FsbCBwZXJmb3JtQXV0aG9yaXphdGlvblJlcXVlc3QoKSA/Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYXV0aG9yaXphdGlvblByb21pc2U7XG4gIH1cbn1cbiJdfQ==