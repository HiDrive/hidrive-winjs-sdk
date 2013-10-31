
# HiDrive WinJS SDK #
## Introduction ##

The [HiDrive WinJS SDK](https://dev.strato.com/hidrive/) lets you easily integrate HiDrive into your website or web app.

##Installation##

This section describes the basic steps for installing the HiDrive SDK for WinJS.

### Get the HiDrive SDK for WinJS
To get the source code of the SDK via git just type:

    git clone https://github.com/HiDrive/hidrive-winjs-sdk.git
    cd ./hidrive-js-sdk
    
### Use the HiDrive SDK for WinJS components on your web page
To use the components from the HiDrive SDK for WinJS on your web page, just include the **sdk.js** and **sdk.winjs.js** or **sdk.min.js** file in
your code.

For example, include one of the following tags in your code:

    <script type="text/javascript" src="/yourpath/sdk.js"></script>
    <script type="text/javascript" src="/yourpath/sdk.winjs.js"></script>

Or:

    <script type="text/javascript" src="/yourpath/sdk.min.js"></script>

To load the SDK you must load both a **sdk.js** and **sdk.winjs.js** file! The minified version already includes both files.

##Usage##

###Basic use

hidrive-js-sdk is exposed as a global variable `HiDriveApi`.

To start using the SDK just add this script to your HTML and initialize the client with your own:

```js
HiDriveApi.options({ 'appSecret': YOUR_APP_SECRET }); 
HiDriveApi.options({ 'appId': YOUR_APP_ID });
HiDriveApi.options({ 'type': 'refresh_token' });
HiDriveApi.options({ 'grantScope': 'admin,rw' });
HiDriveApi.options({ 'redirectUrl': 'http://localhost:12345/' });
HiDriveApi.options({ 'language': 'en' });
```

Set the appropriate parameters before requesting API.

### Configuration options

When this method is called with no parameters it will return all of the current options

```js
var options = HiDriveApi.options();
```

When this method is called with a string it will return the value of the option 
if exists, null if it does not. 

```js
var options = HiDriveApi.options();
```

When this method is called with an object it will merge the object onto the previous 
options object.  

```js
HiDriveApi.options({appId: '123456'});
//will set userName and accessToken options
HiDriveApi.options({userName: 'ABC', accessToken: 'XYZ'});
//will get the accessToken of 'XYZ' 
var accessToken = HiDriveApi.options('accessToken'); 
```

The existing options are:

* `'accessToken'`: Access token.
* `'appId'`: Application id.
* `'userScope'`: User scope.
* `'grantScope'`: Grant scope.
* `'type'`: Grant type.
* `'redirectUrl'`: Login redirect url for oAuth e.g. 'http://localhost:12345/'.
* `'language'`: Language for the login dialog.
* `'user'`: The path to the file to download.
* `'userName'`: User name.
* `'accountId'`: Account id.
* `'refreshToken'`: Refresh token.

###OAuth Requests
For documentation on how to , please see the HiDrive developer portal. https://dev.strato.com/hidrive/

### API

#### Obtaining API Request URL

##### Get API URL
Makes a call to get the url for the API calls GET, POST, PUT and DELETE.

```js
var url = HiDriveApi.getApiUrl();
```

##### Get API File Transaction URL
Returns a url for a background upload or download operation:

```js
var properties = {dir: 'root/public', name: 'foo.jpg', on_exist: 'autoname'};
var url = HiDriveApi.getFileTransactionUrl(properties);
```

##### Get API Login URL
Makes a call to get the url for the login process. 

```js
var url = HiDriveApi.getLoginUrl();
```

##### Get URL for oAuth
Makes a call to get the url for access token request.

```js
var url = HiDriveApi.getOAuthUrl();
```

#### Post

```js
var promise = HiDriveApi.post(path, parameters);
```

For example, create a new directory 

```js
var parameters = {path: root/users/foobar/existingDir/newDir};
HiDriveApi.post("/dir", parameters).done(function(response){
    //do something with response
}, function(err){

}, function(prog){

});
```

#### Get

```js
var promise = HiDriveApi.get(path, parameters);
```

For example, get directory members 

```js
var parameters = {path: 'root/public/XYZ'};
HiDriveApi.get("/dir", parameters).done(function(response){
    //do something with response
}, function(err){

}, function(prog){

});
```
Or get corresponding sharelink:
```js
var parameters = { id: '123456' };
HiDriveApi.get("/sharelink", parameters).done( function(response) {
    //do something with response
}, function(){

}, function(){

});
```


#### Delete

```js
var promise = HiDriveApi.get(path, parameters);
```

For example, delete a file

```js
var parameters = {path: 'root/public/foo.txt'};
HiDriveApi.delete("/file", parameters).done(function(response){
    //do something with response
}, function(err){

}, function(prog){

});
``` 

#### Put

```js
var promise = HiDriveApi.put(path, parameters);
```

For example, change user data 

```js
var parameters = {account: '1234', alias: 'XYZ', password: '******'};
HiDriveApi.put("/user", parameters).done(function(response){
    //do something with response
}, function(err){

}, function(prog){

});
``` 

#### Refresh access token
Makes a call to refresh a access token. An access token is valid until it expires.

For example, suppose you want refresh the access token:
```js
   var refreshToken = HiDriveApi.options('refreshToken');
   HiDriveApi.refreshAccessToken(refreshToken).done(function(response){
      //do something with response.access_token
   }, function(err){
   });
```

#### Session Clear
Makes a call to clear session configuration options. The following parameters are deleted:

```js
HiDriveApi.sessionClear();
```
#### Check authorization
Makes a call to verify whether the current user is authorized or not.

```js
HiDriveApi.isAuthorized();
```

#### Logout
Makes a call to clear the session data(access token, user name, account id, user scope) and revokes exists refresh token.

```js
HiDriveApi.logout();
```

#### Clear session
Makes a call to clear session configuration options. The following parameters are deleted:

```js
HiDriveApi.sessionClear();
```

###Learn More
For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation/