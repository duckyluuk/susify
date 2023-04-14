const canvas = document.getElementById('canvas');
canvas.width = 0;
canvas.height = 0;
const ctx = canvas.getContext('2d');
let size = 3;
let coloroffset = 16;

function putImageOnCanvas(image) {
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  susifyCanvas();
}

function downloadCanvas() {
  const filename = document.getElementById('file').files[0].name.split('.')[0];
  const link = document.createElement('a');
  link.download = 'sus_' + filename + '.png';
  link.href = canvas.toDataURL();
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
    document.getElementById('info').innerHTML = 'Complete Crewmates: ' + complete + ', Partial Crewmates: ' + partial;
    document.getElementById('output').style.display = 'block';
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

function uploadImage() {
    const file = document.getElementById('file').files[0];
    document.getElementById('menu').style.display = 'none';
    size = +document.getElementById('size').value;
    coloroffset = +document.getElementById('offset').value;
    const reader = new FileReader();
    reader.onload = function (e) {
        const image = new Image();
        image.onload = function () {
        document.getElementById('output').style.width = (image.width + 200) + 'px';
        document.getElementById('output').style.height = (image.height + 250) + 'px';
        putImageOnCanvas(image);
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function reset() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('output').style.display = 'none';
    document.getElementById('file').value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.getElementById('file').addEventListener('change', uploadImage);

document.getElementById('size').addEventListener('input', function() {
    document.getElementById('size-out').innerHTML = this.value;
});

document.getElementById('offset').addEventListener('input', function() {
    document.getElementById('contrast-out').innerHTML = this.value;
});