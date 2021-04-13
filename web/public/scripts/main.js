/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Signs-in Friendly Chat.
function signIn() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

// Signs-out of Friendly Chat.
function signOut() {
  // Sign out of Firebase.
  firebase.auth().signOut();
}

// Initiate firebase auth.
function initFirebaseAuth() {
  // Listen to auth state changes.
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  return firebase.auth().currentUser.photoURL || '/images/profile_placeholder.png';
}

// Returns the signed-in user's display name.
function getUserName() {
  return firebase.auth().currentUser.displayName;
}

//returnshelp function 
/*function getHelp(){

}*/

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!firebase.auth().currentUser;
}

// Saves a new message on the Cloud Firestore.
function saveMessage(messageText) {
  // Add a new message entry to the Firebase database.
  return firebase.firestore().collection('messages').add({
    name: getUserName(),
    text: messageText,
    profilePicUrl: getProfilePicUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  }).catch(function(error) {
    console.error('Error writing new message to Firebase Database', error);
  });
}

//helpbot
function botMessage(messageText) {
  // Add a new message entry to the Firebase database.
  return firebase.firestore().collection('messages').add({
    name: "Tutor",
    text: messageText,
    profilePicUrl: "https://twemoji.maxcdn.com/2/svg/1f916.svg",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function(error) {
    console.error('Error writing new message to Firebase Database', error);
  });
} 

// Loads chat messages history and listens for upcoming ones.
function loadMessages() {
  // Create the query to load the last 12 messages and listen for new ones.
  var query = firebase.firestore().collection('messages').orderBy('timestamp', 'desc').limit(25);
  
  // Start listening to the query.
  query.onSnapshot(function(snapshot) {
    snapshot.docChanges().forEach(function(change) {
      if (change.type === 'removed') {
        deleteMessage(change.doc.id);
      } else {
        var message = change.doc.data();
        // console.log(message)
        displayMessage(change.doc.id, message.timestamp, message.name,
                      message.text, message.profilePicUrl, message.imageUrl);
      }
    });
  });
}

// Saves a new message containing an image in Firebase.
// This first saves the image in Firebase storage.
function saveImageMessage(file) {
  // 1 - We add a message with a loading icon that will get updated with the shared image.
  firebase.firestore().collection('messages').add({
    name: getUserName(),
    imageUrl: LOADING_IMAGE_URL,
    profilePicUrl: getProfilePicUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(messageRef) {
    // 2 - Upload the image to Cloud Storage.
    var filePath = firebase.auth().currentUser.uid + '/' + messageRef.id + '/' + file.name;
    return firebase.storage().ref(filePath).put(file).then(function(fileSnapshot) {
      // 3 - Generate a public URL for the file.
      return fileSnapshot.ref.getDownloadURL().then((url) => {
        // 4 - Update the chat message placeholder with the image’s URL.
        return messageRef.update({
          imageUrl: url,
          storageUri: fileSnapshot.metadata.fullPath
        });
      });
    });
  }).catch(function(error) {
    console.error('There was an error uploading a file to Cloud Storage:', error);
  });
}

// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  firebase.messaging().getToken().then(function(currentToken) {
    if (currentToken) {
      console.log('Got FCM device token:', currentToken);
      // Saving the Device Token to the datastore.
      firebase.firestore().collection('fcmTokens').doc(currentToken)
          .set({uid: firebase.auth().currentUser.uid});
    } else {
      // Need to request permissions to show notifications.
      requestNotificationsPermissions();
    }
  }).catch(function(error){
    console.error('Unable to get messaging token.', error);
  });
}

// Requests permissions to show notifications.
function requestNotificationsPermissions() {
  console.log('Requesting notifications permission...');
  firebase.messaging().requestPermission().then(function() {
    // Notification permission granted.
    saveMessagingDeviceToken();
  }).catch(function(error) {
    console.error('Unable to get permission to notify.', error);
  });
}

// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    saveImageMessage(file);
  }
}
//global variable for tutee or tutor
var role = 0;
//global variable for content hints
var contentHint = 0;

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputElement.value && checkSignedInWithMessage()) {
    // if it says help then ask if they are the tutor or tuttee 
    saveMessage(messageInputElement.value).then(function() {
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(messageInputElement);
      toggleButton();
    });
    //hello/hi function
    if (messageInputElement.value.includes("hello")){
      botMessage('Welcome to the simple and compound interest peer learning tool. If you are the tutor please type "I am the tutor" if you are the tutee please type "I am the tutee"');
    }
    if (messageInputElement.value == "hi"){
      botMessage('Welcome to the simple and compound interest peer learning tool. If you are the tutor please type "I am the tutor" if you are the tutee please type "I am the tutee"');
    }

    //tutor directions tree
    if (messageInputElement.value.toLowerCase().includes("i am the tutor")){
        botMessage("The first thing you should do is ask your peer to upload and explain their mind map to you. Remember to let them explain their thinking to you before you try to explain concepts to them."); 
        botMessage("When you are ready for the next phase type 'phase 2'")
        //tutor uses phases
        //set global variable to tutor 
        role = 1;
        counter = -1;
        console.log(role+'tutor')
    }
    //tutor phase 2
    if (messageInputElement.value.toLowerCase().includes("phase 2")){
        botMessage("Now it is your turn to help your peer understand the concept more thoroughly. Either ask your peer questions based on what they told you in the previous phase, or click the hint button for ideas.");
        botMessage("When you are ready for the next phase type 'phase 3'");
      }

    //tutor phase 3
    if (messageInputElement.value.toLowerCase().includes("phase 3")){
        botMessage("Now your peer is going to update thier mind map. You might remind your peer to add new connections between topics that are already on their map. Or create new topics that you discussed together.");
        botMessage("When you are ready for the next phase type 'tutoring complete'");
      }  

    //tutee directions tree
    if (messageInputElement.value.toLowerCase().includes("i am the tutee")){
      botMessage("You should have completed the OLI module and drawn a mind map before today's peer learning. Please upload your mind map using the yellow image button.");
      botMessage("When you are ready for the next direction type 'part 2'");
      //tutee uses parts 
      //set global variable to tutee
      role = 2;
      counter = -1;
      console.log(role+'tutee')
    }
    //tutee part 2
    if (messageInputElement.value.toLowerCase().includes("part 2")){
      botMessage("Now your tutor will help you understand the concepts better. Do your best to answer each question, but it is okay not to know the answer yet. Just ask your tutor to explain it to you.");
      botMessage("When you are ready for the next phase type 'part 3'");
    }

    //tutee part 3
    if (messageInputElement.value.toLowerCase().includes("part 3")){
      botMessage("Now you will update your mind map. You do not need to send it to your tutor again, but you can if you want feedback.");
      botMessage("When you are ready for the next phase type 'tutoring complete'");
    }  
    
    // tutoring complete
    if (messageInputElement.value.toLowerCase().includes("tutoring complete")){
      botMessage("Great job today! It might be nice to thank your peer for thier time. Today's session was a great review for the quiz. We will take the quiz in class next time we meet, good luck!");
    }

    //content hints
    if (messageInputElement.value.toLowerCase().includes("content hints")){
      botMessage("Hello tutor, The hint button will give content hints from now on, type 'I am the tutor' to return to tutoring help");
      //set global variable to tutee
      contentHint = 1;
      counter = -1;
      console.log(contentHint)
    }

    //reset function for debugging
    if (messageInputElement.value.toLowerCase().includes("reset")){
      //reset global variable
      role = 0;
      contentHint = 0;
      console.log(role)
      console.log(contentHint)
    }
  }
}

var counter = -1;
function getHint(e){
  e.preventDefault();
  let tutorlist = ['Try using the sentence frame "Can you explain..."', 'Try using the sentence frame "Many students think.. but really..."','If you need content hints please type "content hints"']
  let tuteelist = ['Try to explain the connections you made in the mind map', 'If you are confused try saying "I am confused about..." ']
  let contentlist = ['Try comparing interest formulas using this tool https://teachbanzai.com/wellness/resources/simple-vs-compound-interest-calculator','Does your partner understand why simple interest is a linear equatin (p.3)','Does your peer understand why compound interest is an exponential function? (p.3)',
  'Does your peer understand what happens with compound interest over a long period of time?','Does your peer understand why the principal remains the same in simple interest, but changes in compound interest? (p.6)', 'Does your partner understand how to use the simple (p.7) and compound interest (p.9) formulas'] // need to add content hints
  console.log (role)
  // if else statement for global variable if undfined ask question if tutor list 1 in tutee list 2 (incrament counter inside tutee/tutor thing)
  if (contentHint ==1) {
    ++counter;
    botMessage (contentlist[counter%(contentlist.length)])
  } else if (role == 1){
    ++counter;
    botMessage (tutorlist[counter%(tutorlist.length)])
  } else if (role == 2){
    ++counter;
    botMessage (tuteelist[counter%(tuteelist.length)])
  } else if (role == 0){
    botMessage ('If you are the tutor please type "I am the tutor" if you are the tutee please type "I am the tutee"')
  }  
  //need to debug content hints
} 

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    //get help
    //var getHelp = getHelp();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for messages.
var MESSAGE_TEMPLATE =
    '<div class="message-container">' +  
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

// Delete a Message from the UI.
function deleteMessage(id) {
  var div = document.getElementById(id);
  // If an element for that message exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

function createAndInsertMessage(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = MESSAGE_TEMPLATE;
  const div = container.firstChild;
  div.setAttribute('id', id);

  // If timestamp is null, assume we've gotten a brand new message.
  // https://stackoverflow.com/a/47781432/4816918
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute('timestamp', timestamp);

  // figure out where to insert new message
  const existingMessages = messageListElement.children;
  if (existingMessages.length === 0) {
    messageListElement.appendChild(div);
  } else {
    let messageListNode = existingMessages[0];

    while (messageListNode) {
      const messageListNodeTime = messageListNode.getAttribute('timestamp');

      if (!messageListNodeTime) {
        throw new Error(
          `Child ${messageListNode.id} has no 'timestamp' attribute`
        );
      }

      if (messageListNodeTime > timestamp) {
        break;
      }

      messageListNode = messageListNode.nextSibling;
    }

    messageListElement.insertBefore(div, messageListNode);
  }

  return div;
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, picUrl, imageUrl, hidden) {
  if (hidden) {
    return 
  }

  var div = document.getElementById(id) || createAndInsertMessage(id, timestamp);
  // profile picture
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }

  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');

  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
  if (messageInputElement.value) {
    submitButtonElement.removeAttribute('disabled');
  } else {
    submitButtonElement.setAttribute('disabled', 'true');
  }
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
var messageListElement = document.getElementById('messages');
var messageFormElement = document.getElementById('message-form');
var messageInputElement = document.getElementById('message');
var submitButtonElement = document.getElementById('submit');
var imageButtonElement = document.getElementById('submitImage');
var imageFormElement = document.getElementById('image-form');
var mediaCaptureElement = document.getElementById('mediaCapture');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');
var hintButtonElement =  document.getElementById('hint');

// Saves message on form submit.
messageFormElement.addEventListener('submit', onMessageFormSubmit);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);

// Listens for hint button
hintButtonElement.addEventListener('click', getHint)

// Toggle for the button.
messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);

// Events for image upload.
imageButtonElement.addEventListener('click', function(e) {
  e.preventDefault();
  mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);

// initialize Firebase
initFirebaseAuth();

 // TODO: Enable Firebase Performance Monitoring.
firebase.performance();

// We load currently existing chat messages and listen to new ones.
loadMessages();