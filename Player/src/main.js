import {
  Broadway
} from './mp4-player'


// (function() {
//   var timeouts = [];
//   var messageName = "zero-timeout-message";

//   // Like setTimeout, but only takes a function argument.  There's
//   // no time argument (always zero) and no arguments (you have to
//   // use a closure).
//   function setZeroTimeout(fn) {
//       timeouts.push(fn);
//       window.postMessage(messageName, "*");
//   }

//   function handleMessage(event) {
//       if (event.source == window && event.data == messageName) {
//         console.log("setZeroTimeout")
//           event.stopPropagation();
//           if (timeouts.length > 0) {
//               var fn = timeouts.shift();
//               fn();
//           }
//       }
//   }

//   window.addEventListener("message", handleMessage, true);

//   // Add the one thing we want added to the window object.
//   window.setZeroTimeout = setZeroTimeout;
// })();

function load() {
  var nodes = document.querySelectorAll('div.broadway');
  for (var i = 0; i < nodes.length; i++) {
    var broadway = new Broadway(nodes[i]);
    broadway.play();
  }
}

window.addEventListener("DOMContentLoaded", (evt) => {
  load()
  console.log("[page load]")
})