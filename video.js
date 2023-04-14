const canvas = document.getElementById('canvas');
canvas.width = 0
canvas.height = 0
const ctx = canvas.getContext('2d');
let size = 0;
let coloroffset = 0;
let fps = 0;
let frame = 0;
let audio = true;
const video = document.createElement('video');
const progress = document.getElementById('progress');
var file, fileURL;
function uploadImage() {
    file = document.getElementById('file').files[0];
    fileURL = URL.createObjectURL(file);
    video.src = fileURL;
    document.getElementById('menu').style.display = 'none';
    
    size = +document.getElementById('size').value;
    coloroffset = +document.getElementById('offset').value;
    fps = +document.getElementById('fps').value;
    audio = document.getElementById('audio').checked;
}

const { createFFmpeg, fetchFile } = FFmpeg;

// create a new FFmpeg object
var ffmpeg = createFFmpeg({ log: false });
window.onload = async () => {
    // load the ffmpeg-core library
    await ffmpeg.load();
    await ffmpeg.run('-version');
}

let downloadLink = ''
var encoder;

video.addEventListener('loadeddata', async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    encoder = new Whammy.Video(fps); 
    video.currentTime = 0;
    // load the library and initialize it
    document.getElementById('output').style.width = (video.videoWidth + 200) + 'px';
    document.getElementById('output').style.height = (video.videoHeight + 250) + 'px';
    document.getElementById('output').style.display = 'block';
    document.getElementById('final').style.display = 'none';
    document.getElementById('goal').innerHTML =  `/${Math.ceil(video.duration * fps)}`
});
video.addEventListener('seeked', function() {
    if(video.currentTime >= video.duration) {
        document.getElementById('status').innerHTML = "Encoding..."
        document.getElementById('goal').innerHTML =  `/${encoder.frames.length - 1}`
        console.log(encoder)
        encoder.compile(false, async function(output){
            document.getElementById('status').innerHTML = "Re-adding audio..."
            document.getElementById('progress').innerHTML = ""
            document.getElementById('goal').innerHTML = ""	
            console.log(audio)
            // add audio to video
            if(audio) {
                await ffmpeg.FS('writeFile', 'video.webm', await fetchFile(output));
                await ffmpeg.FS('writeFile', 'audio.mp4', await fetchFile(file));
                await ffmpeg.run('-i', 'video.webm', '-i', 'audio.mp4', '-c:v', 'copy', '-c:a', 'libopus', '-strict', 'experimental', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.webm');
                const data = ffmpeg.FS('readFile', 'output.webm');
                output = new Blob([data.buffer], {type: 'video/webm'});
            }
            
            downloadLink = (window.webkitURL || window.URL).createObjectURL(output);
            // downloadLink = (window.webkitURL || window.URL).createObjectURL(output);
            document.getElementById('final').style.display = 'block';
            document.getElementById('progress').innerHTML = ""
            document.getElementById('goal').innerHTML = ""
            document.getElementById('status').innerHTML = "SUSIFIED!"

        });
        return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    susifyCanvas();
    encoder.add(canvas);
    video.currentTime += 1 / fps;
    progress.innerHTML = frame;
    frame += 1;
}, false);

function downloadCanvas() {
    const filename = document.getElementById('file').files[0].name.split('.')[0];
    const link = document.createElement('a');
    link.download = 'sus_' + filename + '.webm';
    link.href = downloadLink;
    link.click();
  }
  
function susifyCanvas() {
    let time = Date.now()
    let flipped = false;
    const w = canvas.width;
    const h = canvas.height;
    sx=0;
    const imageData = ctx.getImageData(0, 0, w, h);
    let data = imageData.data;
    let complete = 0;
    let partial = 0;
    for(let y = Math.floor(-0.3*w / size) * size; y < h; y+=dy*size) {
        sy = y-size
        for(let x=sx*size; x < w; x+=4*size) {
            sy+=size
            if(sy > canvas.height) break;
            const pixels = getShapePixels(x, sy, flipped, size);
            if(pixels.length==0) continue;
            if(pixels.length==11*size*size) {
                complete+=1
            } else if(pixels.length>0) {
                partial+=1
            }
            let avgColor = pixels.reduce((acc, [x, y]) => {
                for(let i=0; i<4; i++) {
                    acc[i] += data[(w * y + x) * 4 + i];
                }
                return acc;
            }, [0, 0, 0, 0]).map((color) => color / pixels.length);
            const offset = Math.random()*coloroffset*2-coloroffset;
            for(let i=0; i<3; i++) {
                avgColor[i] = Math.min(Math.max(avgColor[i]+offset, 0), 255)
            }
  
            pixels.forEach(([x, y]) => {
            [data[(w * y + x) * 4], data[(w * y + x) * 4 + 1], data[(w * y + x) * 4 + 2], data[(w * y + x) * 4 + 3]] = avgColor;
            });
        }
        dy=3    	
        if(flipped) {
            sx=(sx-2)%4
            if(sx) dy=2   
        }
        flipped = !flipped;
    }
    ctx.putImageData(imageData, 0, 0);
    console.log(Date.now()-time)
}
  
function getShapePixels(x, y, flipped,size) {
    const width = canvas.width;
    const height = canvas.height;
    
    let pixels = [];
    if(x+3*size < 0 || x >= width || y+3*size <= 0 || y >= height){
        return pixels;
    }
    if(flipped) pixels = [[x, y], [x + 2*size, y], [x, y + 1*size], [x + 1*size, y + 1*size], [x + 2*size, y + 1*size], [x + 3*size, y + 1*size], [x + 2*size, y + 2*size], [x + 3*size, y + 2*size], [x, y + 3*size], [x + 1*size, y + 3*size], [x + 2*size, y + 3*size]];
    else pixels = [[x + 1*size, y], [x + 2*size, y], [x + 3*size, y], [x, y + 1*size], [x + 1*size, y + 1*size], [x, y + 2*size], [x + 1*size, y + 2*size], [x + 2*size, y + 2*size], [x + 3*size, y + 2*size], [x + 1*size, y + 3*size], [x + 3*size, y + 3*size]];

    let finalPixels = [];
    for(let p of pixels) {
        for(let i=0; i<size; i++) {
            if(p[0]+i>=width){
                break;
            }
            if(p[0]+i<0){
                continue;
            }
            for(let j=0; j<size; j++) {
                if(p[1]+j>=height){
                    break;
                }
                if(p[1]+j<0){
                    continue;
                }
                finalPixels.push([p[0]+i, p[1]+j])
            }
        }
    }
    // finalPixels = finalPixels.filter(([x, y]) => x >= 0 && x < width && y >= 0 && y < height);
    return finalPixels;
}

function reset() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('output').style.display = 'none';
    document.getElementById('file').value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame = 0;
    document.getElementById('progress').innerHTML = "Making Sus..."
}

document.getElementById('file').addEventListener('change', uploadImage);

document.getElementById('fps').addEventListener('input', function() {
    document.getElementById('fps-out').innerHTML = this.value;
});

document.getElementById('size').addEventListener('input', function() {
    document.getElementById('size-out').innerHTML = this.value;
});

document.getElementById('offset').addEventListener('input', function() {
    document.getElementById('contrast-out').innerHTML = this.value;
});