import {
  Broadway
} from '../payload'


function load() {
  var nodes = document.querySelectorAll('div.broadway');
  for (var i = 0; i < nodes.length; i++) {
    var broadway = new Broadway(nodes[i]);
    // broadway.play();
  }
}

window.addEventListener("DOMContentLoaded", (evt) => {
  load()
  console.log("[page load]")
})