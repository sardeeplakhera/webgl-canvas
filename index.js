"use strict";

let onLoad = false;
var alert_div = document.getElementById("alert");

function main() {

  if(onLoad === true)
  {
      alert_div.style.display = "block";
      alert_div.innerHTML = "Loading....Please Wait!";
      setTimeout(function(){ alert_div.style.display = "none"; }, 1000);
      return;
  }

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.getElementById("canvas");
  var gl = canvas.getContext("webgl",{preserveDrawingBuffer: true});
  if (!gl) {
    return;
  }

  let total_encoded_size = 0;
  let total_decoded_size = 0;
  gl.canvas.width = window.innerWidth;
  gl.canvas.height = window.innerHeight;

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["drawImage-vertex-shader", "drawImage-fragment-shader"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var textureLocation = gl.getUniformLocation(program, "u_texture");

  // Create a buffer.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Put a unit quad in the buffer
  var positions = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a buffer for texture coords
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Put texcoords in the buffer
  var texcoords = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  const loadImageAndCreateTextureInfo = function(url) {
    // url = "https://i.ibb.co/TvrDgMT/Hanumanji.png";
    url = 1;
    return new Promise((resolve,reject) => {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // Fill the texture with a 1x1 blue pixel.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([0, 0, 255, 255]));

      // let's assume all images are not a power of 2
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      var textureInfo = {
        width: 1,   // we don't know the size until it loads
        height: 1,
        texture: tex,
      };
      var img = new Image();
      // img.src = "https://ibb.co/mDSrc5B";
      // img.src = url;
      img.src = "./"+url+"_image.jpg";
      img.addEventListener('load', function() {
        fetch(img.src).then(resp => resp.blob())
          .then(blob => {
                  debugger;
                  total_encoded_size += blob.size;
                  total_decoded_size += img.height*img.width*4;
                  textureInfo.width = img.width/50;
                  textureInfo.height = img.height/50;
                  textureInfo.name = url;
                  
                  gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                  resolve(textureInfo);
                })
            .catch(err => {
                // console.log("err: "+err);
                reject(url);
            });
        
      });
      img.onerror = function(){
        // console.log("Error ! Image not available "+i);
        reject(url);
    }
    }) 
  }

  var textureInfos = [];
  var drawInfos = [];
  var speed = 60;
  let animate = false;
  var options = document.getElementsByName("animation_group");
  for(var i=0;i<options.length;i++)
  {
    if(options[i].checked)
    {
      animate = options[i].value;
    }
  }


  let img_num = document.getElementById("img_num").value;
  if(img_num != null && img_num>0 && Number.isInteger(parseInt(img_num)))
  {
      onLoad = true;
      var png = document.createElement("img");
      png.src = "../resources/loading.gif";
      document.getElementById("inputs_holder").appendChild(png);

      let promises = [];
      let rejects = [];
      let i;
      for(i=1;i<=img_num;i++)
      {
          promises.push(loadImageAndCreateTextureInfo(i));
      }
      
      Promise.all(promises.map(p => p.catch(e => null))).then(function(values){
        onLoad = false;
        document.getElementById("inputs_holder").removeChild(png);
        alert_div.style.display = "block";
        alert_div.innerHTML = "Total encoded images size is "+total_encoded_size/(1000*1000*1000) +" GB and total images decoded size is "+total_decoded_size/(1000*1000*1000)+" GB";
          var new_values = values.filter((value)=>value!=null);
          textureInfos = new_values;

          for (var ii = 0; ii < img_num; ++ii) {
            // console.log("prev height",prev_height);
            var drawInfo = {
              x: Math.random() * gl.canvas.width,
              y: Math.random() * gl.canvas.height,
              dx: Math.random() > 0.5 ? -1 : 1,
              dy: Math.random() > 0.5 ? -1 : 1,
              textureInfo: textureInfos[ii],
            };
            drawInfos.push(drawInfo);
          }
          if(animate === "doAnimate")
          {
            requestAnimationFrame(render);
          }
          else{
            draw();
          }

      })
      .catch(err => {
          console.log("error for all promises "+err);
      })
  }
  else{
      alert_div.style.display = "block";
      alert_div.innerHTML = "Please give valid image number";
      setTimeout(function(){ alert_div.style.display = "none"; }, 1000);
      document.getElementById("inputs_holder").removeChild(png);
  }

  // for drawing static images
  function draw() {
 
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    drawInfos.forEach(function(drawInfo) {
      drawImage(
        drawInfo.textureInfo.texture,
        drawInfo.textureInfo.width,
        drawInfo.textureInfo.height,
        drawInfo.x,
        drawInfo.y);
    });
  }

  // to maintain the image co-ordinates so that image is within the bounds of canvas
  function update(deltaTime) {
    drawInfos.forEach(function(drawInfo) {
      drawInfo.x += drawInfo.dx * speed * deltaTime;
      drawInfo.y += drawInfo.dy * speed * deltaTime;
      if (drawInfo.x < 0) {
        drawInfo.dx = 1;
      }
      if (drawInfo.x >= gl.canvas.width) {
        drawInfo.dx = -1;
      }
      if (drawInfo.y < 0) {
        drawInfo.dy = 1;
      }
      if (drawInfo.y >= gl.canvas.height) {
        drawInfo.dy = -1;
      }
    });
  }

  // to animate images, render function is used which called recursively
  var then = 0;

  function render(time) {
    var now = time * 0.001;
    var deltaTime = Math.min(0.1, now - then);
    then = now;

    update(deltaTime);
    draw();

    requestAnimationFrame(render);
  }
  

  // Unlike images, textures do not have a width and height associated
  // with them so we'll pass in the width and height of the texture
  function drawImage(tex, texWidth, texHeight, dstX, dstY) {
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // this matirx will convert from pixels to clip space
    var matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    // this matrix will translate our quad to dstX, dstY
    matrix = m4.translate(matrix, dstX, dstY, 0);

    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
    matrix = m4.scale(matrix, texWidth, texHeight, 1);
    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(textureLocation, 0);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

