# MOVE Demo Backend
The MOVE Demo Backend is a NodeJS application that can serve as the backend for the MOVE Demo App.

## How to Deploy
The Move Demo Backend is meant to be deployed as a Firebase Function.
To deploy to firebase you will need a Google Account, a Firebase Project set to the Blaze Plan, and the `firebase-cli` installed on your machine.

### 1) Cloning the repository
Clone or download this repository and open the resulting directory.
### 2) Create and Link a Firebase Project
If you did not already do so you can set up a new project in the [Firebase Console](https://console.firebase.google.com/).
Then change the project to be on the [Blaze Plan](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans#switch-between-pricing-plans).
Configure the project to use your firebase project by running `firebase use --add`, and following the given instructions.
### 3) Configure 
In the `functions/` directory create a `.env` file with the following contents:
```
  MOVE_SECRET_KEY=<SOME_RANDOM_STRING>
  MOVE_SDK_PROJECT_ID=<YOUR_MOVE_PROJECTID>
  MOVE_SDK_API_KEY=<YOUR_MOVE_API_KEY>
```
### 4) Install dependencies
Install the dependencies for the NodeJS project in the `functions/` directory by navigating there and running `npm install`
### 5) Deploy to Firebase
Run the command `firebase deploy`.
After the deploy command finishes, check the output for the URL of your function.

Note: While running `firebase deploy` firebase may ask you to enable certain APIs or change project settings. If it does you will need to make the necessary changes and rerun the `firebase deploy` command.

### Deploying in other environments
In the `functions/src/index.ts` file a standard ExpressJS application is constructed. 
You should be able to run it in any environments where NodeJS applications may be hosted. 
But you will need to replace the last line in the `index.ts` file, and call the appropiate startup mechanism 
for your environment. (e.g. `app.listen(8080)` to run locally on port 8080).

The MOVE Demo Backend depends on Firestore as a Database. 
To use another Database the repository interfaces in `messages/db/repository.ts` and `users/db/repository.ts` will need to be reimplemented.

## File Structure
The MOVE Demo App is a firebase functions based application.
Configuration files concerning just Firebase are located at the top-level.
The `function` directory contains the NodeJS application that actually implements the MOVE Demo Backend.

