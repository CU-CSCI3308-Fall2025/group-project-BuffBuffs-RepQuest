# RepQuest

## About 
RepQuest is a fitness focused application designed to help beginners build their confidence in the gym. The app provides simple, structured workout routines that can guide users towards forming consistent habits and sustainable fitness goals in the long term. With a clean and intuitive interface, RepQuest allows users to track their workouts and celebrate milestones along the way. Users can view their weekly workout calendar and achievements they've unlocked along their journey to stay motivated as they move through their fitness journey. RepQuest is built to make going to the gym feel approachable, achieveable, and rewarding for anyone out there just starting out!

## Team Members
- Dalton Ford [@DaltonRFM](https://github.com/DaltonRFM)
- Keira Wagstaff [@keirawagstaff](https://github.com/keirawagstaff)
- Addie Hoeft  [@alhoeft](https://github.com/alhoeft)
- Cole Spencer [@Colejx](https://github.com/Colejx)
- Zandra Palermo [@zandrapalermo](https://github.com/zandrapalermo)

## Technology Stack 
- **Web Application**: HTML, CSS, Handlebars, Javascript
- **Middleware**: Docker
- **Database**: PostgreSQL
- **Deployment**: Render

## Prerequisites
Please ensure that the following softwares have been installed prior to accessing the application:
- PostgreSQL
- Docker
- Node.js
- Chai
- Mocha

## How to Run RepQuest
To run locally, please follow these steps:
1. Download the repository on your local machine. 
2. Confirm that you have all the prerequisite softwares installed to your system.
3. Navigate to the repository on your local machine, go into the ProjectSourceCode folder.
4. In your terminal, run 'docker compose up -d'
5. In your browser, navigate to [localhost:3000](localhost:3000) to access the application! Enjoy!

## Running Tests
To run tests for RepQuest, execute the following steps:
1. Make sure you have Docker downloaded and up to date.
2. Open the "docker-compose.yaml" file
3. Navigate to line 25
4. Change 'npm start' to 'npm run testandrun'
5. In your terminal, run 'docker compose up -d'
6. In your terminal, before your tests are displayed you should see:
    web-1  | > test
    web-1  | > mocha
7. If your tests ended up running correctly, you should see something displayed similar to the example below:
    web-1  | The server is running on http://localhost:300
    web-1  |   Server!
    web-1  |     ✓ Returns the default welcome message (51ms)
    web-1  |
    web-1  |   Testing Login API
    web-1  |     ✓ Negative : /login. Checking invalid username and password (586ms)
    web-1  | 
    web-1  |   Testing Register API
    web-1  |     ✓ positive : /register (113ms)
    web-1  | 
    web-1  | 
    web-1  |   3 passing (772ms)            

## Deployed Application
https://group-project-buffbuffs-repquest.onrender.com