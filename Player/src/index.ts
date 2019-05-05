import '../screen.css'

window.addEventListener("DOMContentLoaded", (evt: any) => {
  function load() {
    var nodes = document.querySelectorAll('div.broadway')
    for (var i = 0; i < nodes.length; i++) {
      var broadway = new Broadway(nodes[i]);
      broadway.play();
    }
  }
  load()
})
