var http = require('http');
var fs = require('fs');
var finalHandler = require('finalhandler');
var queryString = require('querystring');
var Router = require('router');
var bodyParser   = require('body-parser');
var uid = require('rand-token').uid;


const PORT = 3001;
const TOKEN_VALIDITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let brands = [];
let users = [];
//let user = {};
let accessTokens = [];
let products = [];
let loggedInUser= {};

var myRouter = Router();
myRouter.use(bodyParser.json());

//Server Data Setup and Router
const server = module.exports = http.createServer( (request, response) => {
    myRouter(request, response, finalHandler(request, response))
})
.listen(PORT,error => {
    if (error) {
        return console.log("Error on Server Startup: ", error);
    }
    //brands = JSON.parse(fs.readFile('initial-data/brands.json','utf-8'));
    
    fs.readFile('app/initial-data/brands.json','utf-8', (error, data) => {
        if (error) throw error;
        brands = JSON.parse(data);
        console.log(`Server setup: ${brands.length} brands loaded`);
    });
    //users = JSON.parse(fs.readFileSync('initial-data/users.json','utf-8'));
    
    fs.readFile('app/initial-data/users.json','utf-8', (error, data) => {
        if (error) throw error;
        users = JSON.parse(data);
        user = users[0];
        console.log(`Server setup: ${users.length} users loaded`);
    });

    
    // products = JSON.parse(fs.readFileSync('initial-data/products.json','utf-8'));
    
    fs.readFile('app/initial-data/products.json','utf-8', (error, data) => {
        if (error) throw error;
        products = JSON.parse(data);
        console.log(`Server setup: ${products.length} products loaded`);
    });
});

myRouter.get('/api/brands', (request,response) => {
//should return all brands in database
    console.log(request.params);
    response.writeHead(200,{'Content-Type': 'application/json'});
    return response.end(JSON.stringify(brands));
});

myRouter.get('/api/brands/:id/products', (request,response) => {
//should return all products of a certain brand
    console.log(request.params)
    const brandId = request.params.id;
    const brand = brands.find(b=> b.id == brandId);
    console.log(brand);
    if (!brand) {
      console.log('brand id:',brand);
        response.writeHead(404, "That brand does not exist");
        return response.end();
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    const productsOfBrand = products.filter(
        p => p.categoryId == brandId
    );
    return response.end(JSON.stringify(productsOfBrand))
        
});

myRouter.get('/api/products', (request,response)=>{
//should return all products
console.log(request.params);
    response.writeHead(200,{'Content-Type': 'application/json'});
    return response.end(JSON.stringify(products));
});

myRouter.post('/api/login', (request,response)=>{
  //authentication
  // Make sure there is a username and password in the request
  // See if there is a user that has that username and password
  // Write the header because we know we will be returning successful at this point and that the response will be json
  // If we already have an existing access token, use that
  // Update the last updated value of the existing token so we get another time period before expiration
  // Create a new token with the user value and a "random" token
  // When a login fails, tell the client in a generic way that either the username or password was wrong
  // If they are missing one of the parameters, tell the client that something was wrong in the formatting of the response

  console.log(request.body);
  let loginEmail = request.body.email;
  let loginPassword = request.body.password;

  loggedInUser = users.find(user=> (user.email == loginEmail) && (user.login.password == loginPassword))

  if(!loggedInUser){
    response.writeHead(404,"Email and/or Password is incorrect.")
    return response.end();
  } else {
    response.writeHead(200,{'Content-Type': 'application/json'})
  }

  let currentAccessToken = accessTokens.find(t=> t.username == loggedInUser.login.username);

  if (currentAccessToken) {
    currentAccessToken.lastUpdated = new Date();
    return response.end(JSON.stringify(currentAccessToken.token))
  } else {
    let newToken = {
      username: loggedInUser.login.username,
      lastUpdated: new Date,
      token: uid(16)
    }
    accessTokens.push(newToken);
    return response.end(JSON.stringify(newToken.token))
  }
});

// Helper method to process access token
var getValidTokenFromRequest = function(request) {
  var parsedUrl = require('url').parse(request.url, true);
  if (parsedUrl.query.accessToken) {
    // Verify the access token to make sure it's valid and not expired
    let currentAccessToken = accessTokens.find((accessToken) => {
      return accessToken.token == parsedUrl.query.accessToken && ((new Date) - accessToken.lastUpdated) < TOKEN_VALIDITY_TIMEOUT;
    });
    if (currentAccessToken) {
      return currentAccessToken;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

myRouter.get('/api/me/cart', (request,response)=>{
//cart content of authenticated user  

  let currentAccessToken= getValidTokenFromRequest(request);
  if (!currentAccessToken) {
    response.writeHead(401, 'No valid token is supplied');
    return response.end();
  } else { //returns authenticated user's cart contents.
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(loggedInUser.cart))
  }

});

myRouter.post('/api/me/cart', (request,response)=>{
//add item(s) to cart of authenticated user
  let currentAccessToken= getValidTokenFromRequest(request);
  if (!currentAccessToken) {
    response.writeHead(401, 'No valid token is supplied');
    return response.end();
  } else {
    console.log(request.body);
    let product= request.body
    console.log(loggedInUser.cart);
    loggedInUser.cart.push(product);
    console.log(loggedInUser.cart);
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(loggedInUser.cart))
  }
});

myRouter.delete('/api/me/cart/:productId', (request,response)=>{
//removes item(s) from cart   
  let currentAccessToken = getValidTokenFromRequest(request);
  if (!currentAccessToken){
    response.writeHead('No valid token is supplied')
    return response.end();
  }

  let deletedProduct = request.params.id

  let newCart = loggedInUser.cart.filter(itemInCart =>{
    itemInCart.id != deletedProduct
  });

  loggedInUser.cart = newCart;

  response.writeHead(200, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(loggedInUser.cart));
});

myRouter.post('/api/me/cart/:productId', (request,response)=>{
//update quantity of item(s) in cart
  let currentAccessToken = getValidTokenFromRequest(request);
  if (!currentAccessToken){
    response.writeHead('No valid token is supplied')
    return response.end();
  }
  
  let productToEdit = request.params.id
  let newQuantity = request.body.quantity

  let editedProduct = loggedInUser.cart.find(item =>{
    item.id = productToEdit;
    item.quantity = newQuantity;
  })

  
  
});