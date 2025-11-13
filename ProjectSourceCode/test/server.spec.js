// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************



// Negative Test Case for /login API
// We are checking POST /login by passing invalid input (invalid email/username and password).
// This test case should pass and return a status 400 along with an "Invalid input" message.

describe('Testing Login API', () => {
  // Example Negative Testcase :
  // API: /login
  // Input: { username: '', password: '' }
  // Expect: res.status == 400 and res.body.message == 'Invalid input'
  // Result: This test case should pass and return a status 400 along with a "Invalid input" message.
  // Explanation: The testcase will call the /login API with the following invalid inputs
  // and expects the API to return a status of 400 along with the "Invalid input" message.

  it('Negative : /login. Checking invalid username and password', done => {
    chai
      .request(server)
      .post('/login')
      .set('Content-Type', 'application/json')
      .send({ username: '', password: '' }) // invalid input
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equals('Invalid input');
        done();
      });
  });
});

// ********************************************************************************
// Positive Test case 
describe('Testing Register API', () => {
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .set('Content-Type', 'application/json')
      .send({ username: `user_${Date.now()}`, password: 'TestPass!234' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('User registered successfully');
        done();
      });
  });
});
