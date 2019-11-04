let chai = require('chai');
let SunglassesServer = require('./server');
let chaiHttp = require('chai-http');
let should = chai.should();
chai.use(chaiHttp);

describe('/GET brands', () => {
    it('it should GET all the brands', done => {
        chai
        .request(SunglassesServer)
        .get('/api/brands')
        .end((err,res)=>{
            res.should.have.status(200);
            res.body.should.be.an('array');
            res.body.length.should.be.eql(5);
            done();
        });
    });
});

describe('/GET products by brand id', () => {
    it('it should GET all products by categoryID', done => {
        chai
        .request(SunglassesServer)
        .get('/api/brands/3/products')
        .end((err,res) => {
            res.should.have.status(200);
            res.body.should.be.an('array');
            res.body.length.should.be.eql(2);
            done();
        });
    });
});


