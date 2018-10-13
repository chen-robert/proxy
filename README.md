### Proxy
*Built with NodeJS*
#### Description
The application redirects all requests of the form `/https://a.website.com/resource` to its corresponding resource. For example, querying `/https://www.google.com` would return the google home page. In addition to this, it inserts `inject.js` into all resources with content type `text/html`. 

`inject.js` is a script that attempts to redirect all resources to the proxy. For example, 
```
<img src="cats.png"></img>
```
should be transformed to 
```
<img src="https://our.proxy/https://website.com/cats.png"></img>
```
*(assuming the host is `website.com`)*
#### Instance
A running instance can be found [here](http://ihs-proxy.herokuapp.com/)
