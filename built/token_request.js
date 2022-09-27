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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRANT_TYPE_AUTHORIZATION_CODE = 'authorization_code';
exports.GRANT_TYPE_REFRESH_TOKEN = 'refresh_token';
/**
 * Represents an Access Token request.
 * For more information look at:
 * https://tools.ietf.org/html/rfc6749#section-4.1.3
 */
var TokenRequest = /** @class */ (function () {
    function TokenRequest(request) {
        this.clientId = request.client_id;
        this.clientSecret = request.client_secret;
        this.redirectUri = request.redirect_uri;
        this.grantType = request.grant_type;
        this.code = request.code;
        this.refreshToken = request.refresh_token;
        this.extras = request.extras;
    }
    /**
     * Serializes a TokenRequest to a JavaScript object.
     */
    TokenRequest.prototype.toJson = function () {
        return {
            grant_type: this.grantType,
            code: this.code,
            refresh_token: this.refreshToken,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            extras: this.extras
        };
    };
    TokenRequest.prototype.toStringMap = function () {
        var map = {
            grant_type: this.grantType,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri
        };
        if (this.code) {
            map['code'] = this.code;
        }
        if (this.refreshToken) {
            map['refresh_token'] = this.refreshToken;
        }
        // copy over extras
        if (this.extras) {
            for (var extra in this.extras) {
                if (this.extras.hasOwnProperty(extra) && !map.hasOwnProperty(extra)) {
                    // check before inserting to requestMap
                    map[extra] = this.extras[extra];
                }
            }
        }
        return map;
    };
    return TokenRequest;
}());
exports.TokenRequest = TokenRequest;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5fcmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90b2tlbl9yZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7O0dBWUc7O0FBSVUsUUFBQSw2QkFBNkIsR0FBRyxvQkFBb0IsQ0FBQztBQUNyRCxRQUFBLHdCQUF3QixHQUFHLGVBQWUsQ0FBQztBQWV4RDs7OztHQUlHO0FBQ0g7SUFTRSxzQkFBWSxPQUF5QjtRQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDcEMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsNkJBQU0sR0FBTjtRQUNFLE9BQU87WUFDTCxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDMUIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQ2hDLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVztZQUM5QixTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDeEIsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQ2hDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtTQUNwQixDQUFDO0lBQ0osQ0FBQztJQUVELGtDQUFXLEdBQVg7UUFDRSxJQUFJLEdBQUcsR0FBYztZQUNuQixVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3hCLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUNoQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDL0IsQ0FBQztRQUVGLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNiLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3pCO1FBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1NBQzFDO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDN0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ25FLHVDQUF1QztvQkFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2pDO2FBQ0Y7U0FDRjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQTdERCxJQTZEQztBQTdEWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0XG4gKiBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlXG4gKiBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlclxuICogZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQge1N0cmluZ01hcH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBHUkFOVF9UWVBFX0FVVEhPUklaQVRJT05fQ09ERSA9ICdhdXRob3JpemF0aW9uX2NvZGUnO1xuZXhwb3J0IGNvbnN0IEdSQU5UX1RZUEVfUkVGUkVTSF9UT0tFTiA9ICdyZWZyZXNoX3Rva2VuJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBUb2tlbiBSZXF1ZXN0IGFzIEpTT04uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5SZXF1ZXN0SnNvbiB7XG4gIGdyYW50X3R5cGU6IHN0cmluZztcbiAgY29kZT86IHN0cmluZztcbiAgcmVmcmVzaF90b2tlbj86IHN0cmluZywgcmVkaXJlY3RfdXJpOiBzdHJpbmc7XG4gIGNsaWVudF9pZDogc3RyaW5nO1xuICBjbGllbnRfc2VjcmV0OiBzdHJpbmc7XG4gIGV4dHJhcz86IFN0cmluZ01hcDtcbn1cblxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQWNjZXNzIFRva2VuIHJlcXVlc3QuXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBsb29rIGF0OlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY3NDkjc2VjdGlvbi00LjEuM1xuICovXG5leHBvcnQgY2xhc3MgVG9rZW5SZXF1ZXN0IHtcbiAgY2xpZW50SWQ6IHN0cmluZztcbiAgY2xpZW50U2VjcmV0OiBzdHJpbmc7XG4gIHJlZGlyZWN0VXJpOiBzdHJpbmc7XG4gIGdyYW50VHlwZTogc3RyaW5nO1xuICBjb2RlOiBzdHJpbmd8dW5kZWZpbmVkO1xuICByZWZyZXNoVG9rZW46IHN0cmluZ3x1bmRlZmluZWQ7XG4gIGV4dHJhczogU3RyaW5nTWFwfHVuZGVmaW5lZFxuXG4gIGNvbnN0cnVjdG9yKHJlcXVlc3Q6IFRva2VuUmVxdWVzdEpzb24pIHtcbiAgICB0aGlzLmNsaWVudElkID0gcmVxdWVzdC5jbGllbnRfaWQ7XG4gICAgdGhpcy5jbGllbnRTZWNyZXQgPSByZXF1ZXN0LmNsaWVudF9zZWNyZXQ7XG4gICAgdGhpcy5yZWRpcmVjdFVyaSA9IHJlcXVlc3QucmVkaXJlY3RfdXJpO1xuICAgIHRoaXMuZ3JhbnRUeXBlID0gcmVxdWVzdC5ncmFudF90eXBlO1xuICAgIHRoaXMuY29kZSA9IHJlcXVlc3QuY29kZTtcbiAgICB0aGlzLnJlZnJlc2hUb2tlbiA9IHJlcXVlc3QucmVmcmVzaF90b2tlbjtcbiAgICB0aGlzLmV4dHJhcyA9IHJlcXVlc3QuZXh0cmFzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlcmlhbGl6ZXMgYSBUb2tlblJlcXVlc3QgdG8gYSBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICovXG4gIHRvSnNvbigpOiBUb2tlblJlcXVlc3RKc29uIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbnRfdHlwZTogdGhpcy5ncmFudFR5cGUsXG4gICAgICBjb2RlOiB0aGlzLmNvZGUsXG4gICAgICByZWZyZXNoX3Rva2VuOiB0aGlzLnJlZnJlc2hUb2tlbixcbiAgICAgIHJlZGlyZWN0X3VyaTogdGhpcy5yZWRpcmVjdFVyaSxcbiAgICAgIGNsaWVudF9pZDogdGhpcy5jbGllbnRJZCxcbiAgICAgIGNsaWVudF9zZWNyZXQ6IHRoaXMuY2xpZW50U2VjcmV0LFxuICAgICAgZXh0cmFzOiB0aGlzLmV4dHJhc1xuICAgIH07XG4gIH1cblxuICB0b1N0cmluZ01hcCgpOiBTdHJpbmdNYXAge1xuICAgIGxldCBtYXA6IFN0cmluZ01hcCA9IHtcbiAgICAgIGdyYW50X3R5cGU6IHRoaXMuZ3JhbnRUeXBlLFxuICAgICAgY2xpZW50X2lkOiB0aGlzLmNsaWVudElkLFxuICAgICAgY2xpZW50X3NlY3JldDogdGhpcy5jbGllbnRTZWNyZXQsXG4gICAgICByZWRpcmVjdF91cmk6IHRoaXMucmVkaXJlY3RVcmlcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuY29kZSkge1xuICAgICAgbWFwWydjb2RlJ10gPSB0aGlzLmNvZGU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVmcmVzaFRva2VuKSB7XG4gICAgICBtYXBbJ3JlZnJlc2hfdG9rZW4nXSA9IHRoaXMucmVmcmVzaFRva2VuO1xuICAgIH1cblxuICAgIC8vIGNvcHkgb3ZlciBleHRyYXNcbiAgICBpZiAodGhpcy5leHRyYXMpIHtcbiAgICAgIGZvciAobGV0IGV4dHJhIGluIHRoaXMuZXh0cmFzKSB7XG4gICAgICAgIGlmICh0aGlzLmV4dHJhcy5oYXNPd25Qcm9wZXJ0eShleHRyYSkgJiYgIW1hcC5oYXNPd25Qcm9wZXJ0eShleHRyYSkpIHtcbiAgICAgICAgICAvLyBjaGVjayBiZWZvcmUgaW5zZXJ0aW5nIHRvIHJlcXVlc3RNYXBcbiAgICAgICAgICBtYXBbZXh0cmFdID0gdGhpcy5leHRyYXNbZXh0cmFdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cbn1cbiJdfQ==