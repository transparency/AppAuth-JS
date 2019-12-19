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

import * as EventEmitter from 'events';
import * as Http from 'http';
import * as Url from 'url';
import {AuthorizationRequest} from '../authorization_request';
import {AuthorizationRequestHandler, AuthorizationRequestResponse} from '../authorization_request_handler';
import {AuthorizationError, AuthorizationResponse} from '../authorization_response';
import {AuthorizationServiceConfiguration} from '../authorization_service_configuration';
import {Crypto} from '../crypto_utils';
import {log} from '../logger';
import {BasicQueryStringUtils, QueryStringUtils} from '../query_string_utils';
import {NodeCrypto} from './crypto_utils';

// TypeScript typings for `opener` are not correct and do not export it as module
import opener = require('opener');
import {ServerHolder} from "./Server";

class ServerEventsEmitter extends EventEmitter {
  static ON_UNABLE_TO_START = 'unable_to_start';
  static ON_AUTHORIZATION_RESPONSE = 'authorization_response';
}

export class NodeBasedHandler extends AuthorizationRequestHandler {
  // the handle to the current authorization request
  authorizationPromise: Promise<AuthorizationRequestResponse|null>|null = null;

  constructor(
      // default to port 8000
      public httpServerPort = 8000,
      utils: QueryStringUtils = new BasicQueryStringUtils(),
      crypto: Crypto = new NodeCrypto()) {
    super(utils, crypto);
  }

  performAuthorizationRequest(
      configuration: AuthorizationServiceConfiguration,
      request: AuthorizationRequest) {
    // use opener to launch a web browser and start the authorization flow.
    // start a web server to handle the authorization response.
    const emitter = new ServerEventsEmitter();

    const requestHandler = (httpRequest: Http.IncomingMessage, response: Http.ServerResponse) => {
      if (!httpRequest.url) {
        return;
      }

      const url = Url.parse(httpRequest.url);
      const searchParams = new Url.URLSearchParams(url.query || '');

      const state = searchParams.get('state') || undefined;
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (!state && !code && !error) {
        // ignore irrelevant requests (e.g. favicon.ico)
        return;
      }

      log('Handling Authorization Request ', searchParams, state, code, error);
      let authorizationResponse: AuthorizationResponse|null = null;
      let authorizationError: AuthorizationError|null = null;
      if (error) {
        log('error');
        // get additional optional info.
        const errorUri = searchParams.get('error_uri') || undefined;
        const errorDescription = searchParams.get('error_description') || undefined;
        authorizationError = new AuthorizationError(
            {error: error, error_description: errorDescription, error_uri: errorUri, state: state});
      } else {
        authorizationResponse = new AuthorizationResponse({code: code!, state: state!});
      }
      const completeResponse = {
        request,
        response: authorizationResponse,
        error: authorizationError
      } as AuthorizationRequestResponse;
      emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, completeResponse);
      response.end('Successfully logged in to MightyText. Please switch back to the MightyText Desktop App. (You can safely close this window)');
    };

    this.authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {
      emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, () => {
        reject(`Unable to create HTTP server at port ${this.httpServerPort}`);
      });
      emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (result: any) => {
        ServerHolder.get().close();
        // server.close();
        // resolve pending promise
        resolve(result as AuthorizationRequestResponse);
        // complete authorization flow
        this.completeAuthorizationRequestIfPossible();
      });
    });

    // let server: Http.Server;
    request.setupCodeVerifier()
        .then(() => {
          try{
            // server = Http.createServer(requestHandler);
            // server.listen(this.httpServerPort);
            /*
            20191219.S.I. - The createServer method will create a new http server listening on the port specified if one
            a server is not already running. If one is running it will just remove any existing requestListeners and add
            a new one.
             */
            ServerHolder.get().createServer(this.httpServerPort, requestHandler);
          } catch(e){
            log(`[MT APP AUTH][ERROR] Unable to setup servers`, e);
          }
          const url = this.buildRequestUrl(configuration, request);
          log('Making a request to ', request, url);
          const windowProcess = opener(url,{}, function(e){
            log(`[MT APP AUTH] Window opened callback triggered! argument returned in callback`, e);
          });
          // opener(url);
          log(`[MT APP AUTH] Window returned by opener method:`, windowProcess);
          setTimeout(()=>{
            try{
              log(`[MT APP AUTH] killing the process!`);
              windowProcess.kill();
              log(`[MT APP AUTH] process killed?`, windowProcess.killed);
            } catch(e){
              log(`[MT APP AUTH] Error occurred aborting process`, e);
            }
          }, 5000);
        })
        .catch((error) => {
          log('Something bad happened ', error);
          emitter.emit(ServerEventsEmitter.ON_UNABLE_TO_START);
        });
  }

  protected completeAuthorizationRequest(): Promise<AuthorizationRequestResponse|null> {
    if (!this.authorizationPromise) {
      return Promise.reject(
          'No pending authorization request. Call performAuthorizationRequest() ?');
    }

    return this.authorizationPromise;
  }
}
