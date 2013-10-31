/**
* Copyright 2013 STRATO AG
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
* http://www.apache.org/licenses/LICENSE-2.0
* 
*     Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* 
* 
* @description
* <h1>HiDrive WinJS SDK</h1>
* <h2>Basic Use</h2>
* <p>
* To start using the SDK just add this script to your HTML and initialize the client with your own:
* <ul>
* <li>application Id</li>
* <li>application secret</li>
* <li>grant scope</li>
* <li>grant type</li>
* <li>redirection URL</li>
* <li>language for the login dialog</li>
* </ul>
* </p>
* 
* <code>
* HiDriveApi.options({ 'appSecret': YOUR_APP_SECRET }); </br>
* HiDriveApi.options({ 'appId': YOUR_APP_ID });</br>
* HiDriveApi.options({ 'type': 'refresh_token' });</br>
* HiDriveApi.options({ 'grantScope': 'admin,rw' });</br>
* HiDriveApi.options({ 'redirectUrl': 'http://localhost:12345/' });</br>
* HiDriveApi.options({ 'language': 'en' });</br>
* </code>
* 
*/
var HiDriveApi = (function () {
    "use strict";
    var authzInProgress = false,
        cancelOAuth,
        del,
        post,
        put,
        get,
        getValues,
        loginOAuth,
        webAuth,
        getStatic,
        logout,
        showLogin,
        refreshAccessToken,
        getFile,
        getThumbnail,
        getFileTransactionUrl,
        getAuthorizationHeader,
        backgroundUpload,
        backgroundDownload,
        options,
        sessionClear;

    loginOAuth = function () {
        return new WinJS.Promise(function (comp, err, prog) {
            // Send the user to authorization  loginUrl
            var startURI = new Windows.Foundation.Uri(HD.getLoginUrl() + "&client_id=" + HD.options('appId') + "&scope=" + HD.options('grantScope') + "&lang=" + HD.options('language'));
            var endURI = new Windows.Foundation.Uri(HD.options('redirectUrl'));

            authzInProgress = true;
            Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
                Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startURI, endURI)
                .done(function (result) {
                    if (result.responseStatus === Windows.Security.Authentication.Web.WebAuthenticationStatus.errorHttp ||
                        result.responseStatus === Windows.Security.Authentication.Web.WebAuthenticationStatus.userCancel) {
                        authzInProgress = false;
                        if (err)
                            err(result.responseErrorDetail);
                    } else if (result.responseData && result.responseData !== undefined && result.responseData !== "") {
                        var loginValues = getValues(result.responseData);
                        comp(loginValues);
                    } else {
                        authzInProgress = false;
                        if (err)
                            err(result);
                    }
                },
                    err, prog);
        });
    };
    
    getValues = function (source) {
        var result = { permission: "rw", level: "admin" };
        if (!source)
            return result;
        if (source.indexOf('?') > -1) {
            source = source.substr(source.indexOf('?') + 1);
        }
        var keyValPairs = source.split("&");
        for (var i = 0; i < keyValPairs.length; i++) {
            var splits = keyValPairs[i].split("=");
            if (splits[0] == "scope") {
                var scope = splits[1].split(",");
                result.permission = scope[0];
                result.level = scope[1];
            } else {
                result[splits[0]] = splits[1];
            }
        }
        return result;
    };
    
    /**
    * Makes a call to start the login sequence. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *
    *    @example
    *       For example, create a new directory 
    *
    *       HiDriveApi.webAuth().done(function(response){
    *           //do something with response
    *           
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    * @access public
    * @function
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    webAuth = function () {
        return new WinJS.Promise(function (comp, err, prog) {
            if (authzInProgress) {
                return;
            }
            if (HD.options('refreshToken')) {
                HD.refreshAccessToken(options('refreshToken'),
                    function (result) {
                        comp(result);
                        return;
                    },
                    function (result) {
                        showLogin(comp, err, prog);
                    }, prog);
            } else {
                showLogin(comp, err, prog);
            }
        });
    };
    
    showLogin = function (comp, err, prog) {
        loginOAuth().done(
            function (result) {
                if (result.permission == "rw") {
                    HD.getRefreshToken(result.code, 
                        function (innerResult) {
                            authzInProgress = false;
                            HD.options({'userScope': result.level});
                            comp(innerResult);
                        },
                        function (innerResult) {
                            cancelOAuth();
                            err(innerResult);
                        }, prog);
                } else {
                    cancelOAuth();
                    err({ error: 'invalid permission' });
                }
            },
            function (result) {
                cancelOAuth();
                err(result);
            });
    };
    
    cancelOAuth = function () {
        HD.sessionClear();
        authzInProgress = false;
    };

    /**
    * POST Method. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *
    *    @example
    *       For example, create a new directory 
    *
    *       var parameters = {path: root/users/foobar/existingDir/newDir};
    *       HiDriveApi.post("/dir", parameters).done(function(response){
    *           //do something with response
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    *   Create a new share link for a given file:
    *   For more details see the HiDrive API Documentation 
    *   https://dev.strato.com/hidrive/documentation/
    *
    *       var parameters = { path: "root/users/foobar/mySharefile.ext", type: "file",
    *                        ttl: 86400, maxcount: 50};
    *       HiDriveApi.post("/sharelink", parameters).done( function(response) {
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    post = function (path, parameters, isShareGallery) {
        return new WinJS.Promise(function (comp, err, prog) {
            HD.post(path, parameters, comp, err, prog);
        });
    };

    /**
    * PUT Method. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *
    *    @example
    *       For example, create a new directory 
    *
    *       var parameters = {account: '1234', alias: 'XYZ', pasword: '******'};
    *       HiDriveApi.put("/user", parameters).done(function(response){
    *           //do something with response
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    put = function (path, parameters) {
        return new WinJS.Promise(function (comp, err, prog) {
            HD.put(path, parameters, comp, err, prog);
        });
    };

    /**
    * DELETE Method. This is an async method that returns a Promise object that
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *    
    *    @example
    *       For example, delete a file 
    *
    *       var parameters = {path: 'root/public/foo.txt'};
    *       HiDriveApi.delete("/file", parameters).done(function(response){
    *           //do something with response
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    del = function (path, parameters, isShareGallery) {
        return new WinJS.Promise(function (comp, err, prog) {
            HD.delete(path, parameters, comp, err, prog);
        });
    };
    
    /**
    * GET Method. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *    
    *    @example
    *       For example, get directory members
    *
    *       var parameters = {path: 'root/public/XYZ'};
    *       HiDriveApi.get("/dir", parameters).done(function(response){
    *           //do something with response
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    *   Get corresponding sharelink:
    *   For more details see the HiDrive API Documentation 
    *   https://dev.strato.com/hidrive/documentation/
    *       
    *       var parameters = { id: '123456' };
    *       HiDriveApi.get("/sharelink", parameters).done( function(response) {
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    get = function (path, parameters) {
        return new WinJS.Promise(function (comp, err, prog) {
            HD.get(path, parameters, comp, err, prog);
        });
    };

    /**
    * Makes a call to get a static documents such as terms & conditions, imprint and data protection regulations.
    * This is an async method that returns a Promise object that allows you to attach events to handle succeeded, failed and progressed situations.
    * When success html should be returned.
    *    
    *    @example
    *       For example, get terms & conditions
    *
    *       HiDriveApi.getStatic(
                "https://www.hidrive.strato.com/apps/windows8/tos_free.html").done(
            function(response){
    *           //do something with response
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [url] The url to the file to download.
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    getStatic = function (url) {
        return new WinJS.Promise(function(comp, err, prog) {
            HD.getStatic(url, comp, err, prog);
        });
    };

    /**
    * Makes a call to clear the session data(access token, user name, accound id, user scope) and revokes exists refresh token.
    *
    * @access public
    * @function
    */
    logout = function () {
        HD.logout();
    };

    /**
    * Makes a call to get a access token string for authorization process. This value should be passed to the XHR call options parameter.
    * 
    * @access public
    * @returns {String} String that contains a authorization header "Bearer myaccesstoken" 
    */
    getAuthorizationHeader = function () {
        return HD.getAuthorizationHeader();
    };

    /**
    * @description
    * 
    * Makes a call to refresh a access token. An access token is valid until it expires.
    * This is an async method that returns a Promise object that allows you to attach events to handle succeeded, failed and progressed situations.
    * For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation/
    *
    * @example 
    *   For example, suppose you want refresh the access token:
    *   
    *    var refreshToken = HiDriveApi.options('refreshToken');
    *    HiDriveApi.refreshAccessToken(refreshToken).done(function(response){
    *       //do something with response.access_token
    *    }, function(err){
    *    });
    *
    * @access public
    * @function
    * @param {String} token Parameter obtained during a previous authorization code exchange. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    refreshAccessToken = function (refreshToken) {
        return new WinJS.Promise(function(comp, err, prog) {
            HD.refreshAccessToken(refreshToken, comp, err); 
        });
    };
    /**
    * Makes a call to download a file. 
    * This is an async method that returns a Promise object that allows you to attach events to handle succeeded, failed and progressed situations.
    * When success a blob should be returned.
    *    
    *    @example
    *       For example, get file as blob
    *       var parameters = {path: 'root/public/foo.jpg'};
    *       HiDriveApi.getFile(parameters).done(function(blob){
    *           //do something with blob
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for uploading a file:
    * <ul>
    * <li> path: Required. Path to an existing file.</li>
    * <li> width: Optional. Maximum width of the thumbnail</li>
    * <li> height: Optional. Maximum height of the thumbnail</li>
    * <li> snapshot: Optional. Name of snapshot</li>
    * </ul>
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    getFile = function (properties) {
        return new WinJS.Promise(function(comp, err, prog) {
            HD.getFile(properties, comp, err, prog);
        });
    };

    /**
    * Makes a call to get a thumbnail for a image file.
    * This is an async method that returns a Promise object that allows you to attach events to handle succeeded, failed and progressed situations.    
    * When success a blob should be returned.
    *    
    *    @example
    *       For example, get file as blob
    *       var parameters = {path: 'root/public/foo.jpg', width: 60, height: 60};
    *       HiDriveApi.getThumbnail(parameters).done(function(blob){
    *           //do something with blob
    *       }, function(err){
    *
    *       }, function(prog){
    *
    *       });
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for downloading a thumbnail:
    * <ul>
    * <li> path: Required. Path to an existing file.</li>
    * <li> width: Optional. Maximum width of the thumbnail</li>
    * <li> height: Optional. Maximum height of the thumbnail</li>
    * <li> snapshot: Optional. Name of snapshot</li>
    * For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    getThumbnail = function (properties) {
        return new WinJS.Promise(function (comp, err, prog) {
            HD.getThumbnail(properties, comp, err, prog);
        });
    };

    /**
    * Returns a url for a background upload or download operation:
    *    
    *    @example
    *       For example, get url for file upload operation
    *
    *       var properties = {dir: 'root/public', name: 'foo.jpg', on_exist: 'autoname'};
    *       HiDriveApi.getFileTransactionUrl(properties, function(blob));
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for creating a url:
    * <ul>
    * <li> path: Optional. The path to the file to download. Only for background download operation.</li>
    * <li> dir: Optional. The name of the file. Only for background upload operation.</li>
    * <li> name: Optional. The target name of the file. Only for background upload operation.</li> 
    * <li> on_exist: Optional. Possible values: "autoname" - Find another name if the destination exists already. Only for background upload operation.</li>
    * @returns {String} Url for background upload and download operations 
    */
    getFileTransactionUrl = function (properties) {
        return HD.getFileTransactionUrl(properties);
    };

    /**
    * @description
    * 
    * Makes a call to upload a file to HiDrive. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *
    * @example 
    *   For example, suppose you want to upload a file:
    *
    *    // Create the picker object and set options
    *    var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
    *    openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.list;
    *    // For example, when choosing a documents folder, restrict the filetypes 
    *    // to documents for your application.
    *    openPicker.fileTypeFilter.replaceAll([".txt", ".docs", ".doc"]);
    *    // Open the picker for the user to pick a file
    *    openPicker.pickSingleFileAsync().then(function (file) {
    *       if (file) {
    *           // Application now has read/write access to the picked file
    *           var properties = {path: "root/public", file_name: file.name, 
    *                             file_input: file, on_exist: 'autoname'};
    *           HiDriveApi.backgroundUpload(properties).done(function(response){
    *               //do something with result
    *           }, function(err){
    *
    *           },function(prog){
    *
    *           });
    *        }
    *    });
    *
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for uploading a file:
    * <ul>
    * <li>path: Required. The path to the file to download.</li>
    * <li>file_name: Required. The name of the file.</li>
    * <li>file_input: Required. The file input object where to read the upload file data.</li>
    * <li>on_exist: Optional. Possible values: "autoname" - Find another name if the destination exists already</li>
    * </ul>
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    backgroundUpload = function (properties) {
        var uploader = new Windows.Networking.BackgroundTransfer.BackgroundUploader();
        uploader.setRequestHeader("Authorization", getAuthorizationHeader());

        var parameters = { dir: encodeURIComponent(properties.path), name: encodeURIComponent(properties.file_name) };
        if (properties.on_exist) {
            parameters.on_exist = properties.on_exist;
        }
        var url = getFileTransactionUrl(parameters);
        var uri = null;
        try {
            uri = new Windows.Foundation.Uri(url);
        } catch (error) {
            return new WinJS.Promise(function (comp, err, prog) {
                err();
            });
        }

        var upload = uploader.createUpload(uri, properties.file_input);

        return upload.startAsync();
    };

    /**
    * @description
    * 
    * Makes a call to download a file from HiDrive. This is an async method that returns a Promise object that 
    * allows you to attach events to handle succeeded, failed and progressed situations.
    *
    * @example 
    *   For example, suppose you want to download a file:
    *
    *   //Creating new file
    *   Windows.Storage.ApplicationData.current.temporaryFolder.createFileAsync(
    *   fileToDownload.name,
    *   Windows.Storage.CreationCollisionOption.replaceExisting).then(
    *   function (localFile) { 
    *       var properties = {path: "root/public/foo.txt", file_output: localFile};
    *       HiDriveApi.backgroundDownload(properties).done(function(response){
    *           //do something with result
    *       }, function(err){
    *
    *       },function(prog){
    *
    *       });
    *   });
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for downloading a file:
    * <ul>
    * <li>path: Required. The path to the file to download.</li>
    * <li>file_output: Required. The file output object where to write the downloaded file data.</li>
    * </ul>
    * @returns {Promise} The Promise object that allows you to attach events to handle succeeded, failed, and progressed situations.
    */
    backgroundDownload = function (properties) {
        var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
        downloader.setRequestHeader("Authorization", getAuthorizationHeader());

        var parameters = { path: properties.path  };
        var url = getFileTransactionUrl(parameters);
        var uri = null;
        try {
            uri = new Windows.Foundation.Uri(url);
        } catch(error) {
            return new WinJS.Promise(function (comp, err, prog) {
                err();
            });
        }

        var download = downloader.createDownload(uri, properties.file_output);
            
        return download.startAsync();
    };

    /**
    * Makes a call to get or sets configuration options (access token, user name, accound id, user scope, application id, application secret ).
    *
    * @example
    * When this method is called with no parameters it will return all of the 
    * current options.
    *   var options = HD.options();
    *
    * When this method is called with a string it will return the value of the option 
    * if exists, null if it does not.      
    *   var applicationId = HD.options('appId');
    *
    * When this method is called with an object it will merge the object onto the previous 
    * options object.      
    *   HD.options({appId: '123456'}); 
    *   HD.options({userName: 'ABC', accessToken: 'XYZ'}); //will set userName and
    *                                                        accessToken options
    *   var accessToken = HD.options('accessToken'); //will get the accessToken of 'XYZ'
    *
    * @access public
    * @function
    * @param {String} keyOrOptions Returns the value of the option if exists, null if it does not. The existing options are:
    * <ul>
    * <li> 'accessToken': Access token. </li>
    * <li> 'appId': Application id. </li>
    * <li> 'userScope': User scope.</li>
    * <li> 'grantScope': Grant scope.</li>
    * <li> 'type': Grant type.</li>
    * <li> 'redirectUrl': Login redirect url for oAuth e.g. 'http://localhost:12345/'.</li>
    * <li> 'language': Language for the login dialog.</li>
    * <li> 'user': The path to the file to download.</li>
    * <li> 'userName': User name.</li>
    * <li> 'accountId': Account id.</li>
    * <li> 'refreshToken': Refresh token.</li>
    * </ul>
    * @returns {Object} When this method is called with no parameters it will return all of the current options e.g. HD.options().
    * When this method is called with a string it will return the value of the option if exists, null if it does not e.g.options('appId').          
    */
    options = function (keyOrOptions) {
        return HD.options(keyOrOptions);
    };

    /**
    * Makes a call to clear session configuration options.
    * The following parameters are deleted:
    * <ul>
    * <li>'accessToken'</li>
    * <li>'userName'</li>
    * <li>'accountId'</li>
    * <li>'userScope'</li>
    * <li>'refreshToken'</li>
    * </ul>
    *
    * @access public
    * @function
    */
    sessionClear = function() {
        HD.sessionClear();
    };

    //namespace
    return {
        get: get,
        getStatic: getStatic,
        webAuth: webAuth,
        logout: logout,
        post: post,
        put: put,
        "delete": del,
        getAuthorizationHeader: getAuthorizationHeader,
        refreshAccessToken: refreshAccessToken,
        getFile: getFile,
        getThumbnail: getThumbnail,
        getFileTransactionUrl: getFileTransactionUrl,
        backgroundDownload: backgroundDownload,
        backgroundUpload: backgroundUpload,
        options: options,
        sessionClear: sessionClear
    };
})();