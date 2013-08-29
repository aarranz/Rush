var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

// Verbose MODE
var vm = false;
if(vm){console.log('VERBOSE MODE: ON \n Feature to test EXTRA_HEADER #FEH');}

// Time to wait to check the status of the task
var TIMEOUT = 1000;
var CREATED = 201; // 200 for older versions
var describeTimeout = 5000;
DEFAULT_PERSISTENCE = 'BODY';

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;
ENDPOINT = fhHOST + ':' + fhPORT;

//Accept self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//Temp Servers
var serversToShutDown = [];

function _validScenario(data){
	it(data.name + data.protocol.toUpperCase() +' /' +data.method +' #FEH', function(done){
		var agent = superagent.agent();
		var id;

		var method;
			switch(data.method){
				case 'DELETE':
					method = 'del';
					break;
				default:
					method = data.method.toLowerCase()
			}

		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
			function connectedCallback() {

				//SET UP the request to the advancedServer
				var req = agent
						[method](RUSHENDPOINT + data.path )
						.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
						.set('x-relayer-persistence',DEFAULT_PERSISTENCE)
						.set('content-type','application/json')
						.set(data.headers)
						if(data.method.toUpperCase() === 'POST' || data.method.toUpperCase() === 'PUT'){
							req = req.send(data.body);
						}
						req.end(function(err, res) {
							expect(err).to.not.exist;
							expect(res.statusCode).to.eql(CREATED);
							expect(res.body).to.exist;
							expect(res.body.id).to.exist;
							if(vm){console.log(res.body.id);}
							id=res.body.id;
							res.text.should.not.include('exception');
						 });
			},
				//DATA inside de advancedServer
			function(dataReceived) {
				expect(dataReceived).to.exist;
				dataReceived.method.should.be.equal(data.method);
				dataReceived.url.should.be.equal(data.path);
        if(data.responseHeaders){
          Object.keys(data.responseHeaders).forEach(
		          function(rhk){
		            expect(dataReceived.headers[rhk.toLowerCase()]).to.exist;
			          if(vm){console.log('DATA RECEIVED: ' + dataReceived.headers[rhk.toLowerCase()]);}
                dataReceived.headers[rhk.toLowerCase()].trim().should.eql(data.responseHeaders[rhk].trim());
              })
        }

				//Checks in the retrieved task response from RUSH
				var checked = false;
				setTimeout(function() {
					agent
							.get(RUSHENDPOINT +'/response/' + id)
							.end(function onResponse2(err2, res2) {
								expect(err2).to.not.exist;
								expect(res2).to.exist;
								expect(res2.statusCode).to.exist;
								expect(res2.statusCode).to.equal(200);
								expect(res2.body).to.exist;
								if(vm){console.log('RUSH RESPONSE: ', res2.body);}
								expect(res2.body['body']).to.equal('Request Accepted');
								res2.headers['content-type'].should.eql('application/json; charset=utf-8');
								res2.text.should.include('id');
								res2.text.should.include('state');
								res2.body['state'].should.eql('completed');
								done();
							});
				}, TIMEOUT);
			});
		serversToShutDown.push(simpleServer);
	});
}

function _invalidScenario(data){
	var vm = true;

	it(data.name + data.protocol.toUpperCase() +' /' +data.method +' #FEH', function(done){
		var agent = superagent.agent();
		var id;

		var method;
		switch(data.method){
			case 'DELETE':
				method = 'del';
				break;
			default:
				method = data.method.toLowerCase()
		}

		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
				function connectedCallback() {

					//SET UP the request to the advancedServer
					var req = agent
							[method](RUSHENDPOINT + data.path )
							.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
							.set('x-relayer-persistence',DEFAULT_PERSISTENCE)
							.set('content-type','application/json')
							.set(data.headers)
					if(data.method.toUpperCase() === 'POST' || data.method.toUpperCase() === 'PUT'){
						req = req.send(data.body);
					}
					req.end(function(err, res) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.eql(CREATED);
						expect(res.body).to.exist;
						expect(res.body.id).to.exist;
						if(vm){console.log(res.body.id);}
						id=res.body.id;
						res.text.should.not.include('exception');
					});
				},
				//DATA inside de advancedServer
				function(dataReceived) {
					expect(dataReceived).to.exist;
					dataReceived.method.should.be.equal(data.method);
					dataReceived.url.should.be.equal(data.path);
					if(data.responseHeaders){
						Object.keys(data.responseHeaders).forEach(
								function(rhk){
									expect(dataReceived.headers[rhk.toLowerCase()]).to.exist;
									if(vm){console.log('DATA RECEIVED: ' + dataReceived.headers[rhk.toLowerCase()]);}
									dataReceived.headers[rhk.toLowerCase()].trim().should.eql(data.responseHeaders[rhk].trim());
								})
					}

					//Checks in the retrieved task response from RUSH
					var checked = false;
					setTimeout(function() {
						agent
								.get(RUSHENDPOINT +'/response/' + id)
								.end(function onResponse2(err2, res2) {
									expect(err2).to.not.exist;
									expect(res2).to.exist;
									expect(res2.statusCode).to.exist;
									expect(res2.statusCode).to.equal(200);
									expect(res2.body).to.exist;
									if(vm){console.log('RUSH RESPONSE: ', res2.body);}
									expect(res2.body['body']).to.equal('Request Accepted');
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.text.should.include('id');
									res2.text.should.include('state');
									res2.body['state'].should.eql('completed');
									done();
								});
					}, TIMEOUT);
				});
		serversToShutDown.push(simpleServer);
	});
}



describe('Feature: Extra header '  + '#FEH', function() {
	this.timeout(describeTimeout);
	//Start Rush before every test launch
	before(function (done) {
		listener.start(function() {
			consumer.start(done);
		});
	});

	//Stop Rush after every test launch
	after(function (done) {
		listener.stop(function() {
			consumer.stop(done);
		});
	});

	afterEach(function() {
		for (var i = 0; i < serversToShutDown.length; i++) {
			try {
				serversToShutDown[i].close();
			} catch (e) {}
		}
		serversToShutDown = [];
	});


	describe('Retrieve request with a valid header policy request using HTTPS #FEH', function () {

    var responseHeaders = {
	    'Fake-User-Agent':'Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 ',
      'Accept-Language':'es-ES,es;q=0.8', 
	    'x': 'X-relayer-NoHost:localhost:8000'
    };
    var extraHeaders = {
	    'X-Relayer-Protocol':'https',
	    'X-Relayer-Header': [
	      encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
	      encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 '),
	      encodeURIComponent('Accept-Language:es-ES,es;q=0.8')
	    ].join(', ')};
		
		var dataSetHTTPS = [
			{protocol : 'HTTPS', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : 'EXTRAHEADER: 1 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'HTTPS', method: 'POST', path: '/', headers: extraHeaders, body: {},
        name : 'EXTRAHEADER: 2 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'HTTPS', method: 'PUT', path: '/', headers: extraHeaders, body: {},
        name : 'EXTRAHEADER: 3 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'HTTPS', method: 'DELETE', path: '/', headers: extraHeaders, body: {},
        name : 'EXTRAHEADER: 4 Should accept the request using ', responseHeaders: responseHeaders}
		];

		for(i=0; i < dataSetHTTPS.length; i++){
			_validScenario(dataSetHTTPS[i]);  //Launch every test in data set
		}
	});

	describe('Retrieve request with a valid header policy request using HTTP #FEH', function () {
    var responseHeaders = {
	    'Fake-User-Agent':'Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 ',
      'Accept-Language':'es-ES,es;q=0.8',
	    'x': 'X-relayer-NoHost:localhost:8000'
       };

    var extraHeaders = {
	    'X-Relayer-Protocol':'http',
	    'X-Relayer-Header': [
	      encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
	      encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 '),
	      encodeURIComponent('Accept-Language:es-ES,es;q=0.8')
		    ].join(', ')};
		
		var dataSetHTTP = [
      {protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : 'EXTRAHEADER: 1 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'POST', path: '/', headers: extraHeaders, body: {},
				name : 'EXTRAHEADER: 2 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'PUT', path: '/', headers: extraHeaders, body: {},
				name : 'EXTRAHEADER: 3 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'DELETE', path: '/', headers:extraHeaders, body: {},
				name : 'EXTRAHEADER: 4 Should accept the request using ', responseHeaders: responseHeaders}
		];

		for(i=0; i < dataSetHTTP.length; i++){
			_validScenario(dataSetHTTP[i]);  //Launch every test in data set
		}
	});


	describe.skip('Retrieve request with a INvalid header policy request #FEH', function () {
		var responseHeaders = {
			'header_uno': 'header_1',
			'header_dos': 'header_2',
			'header_tres': 'header_3',
			'x': 'X-relayer-NoHost:localhost:8000',
			'X-Relayer-Header': 'test:test'
		};

		var extraHeaders = {
			'X-Relayer-Protocol':'http',
			'X-Relayer-Header': [
				encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
				encodeURIComponent('header_uno: header_1'),
				encodeURIComponent('header_dos: header_2'),
				encodeURIComponent('header_tres: header_3'),
				encodeURIComponent('gabled:es-ES,es;q=0.8'),
				encodeURIComponent('X-Relayer-Header: test:test')
			].join(', ')};

		var dataSetHTTP = [
			{protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
				name : 'EXTRAHEADER: 1 Should NOT be sent as a extra header ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'POST', path: '/', headers: extraHeaders, body: {},
				name : 'EXTRAHEADER: 2 Should NOT accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'PUT', path: '/', headers: extraHeaders, body: {},
				name : 'EXTRAHEADER: 3 Should NOT accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'DELETE', path: '/', headers:extraHeaders, body: {},
				name : 'EXTRAHEADER: 4 Should NOT accept the request using ', responseHeaders: responseHeaders}
		];

		for(i=0; i < dataSetHTTP.length; i++){
			_invalidScenario(dataSetHTTP[i]);  //Launch every test in data set
		}
	});


});

//TODO: path different to empty
