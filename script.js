//画像を描画する
const myImg = new Image();
myImg.src = './image/eye-closeup02.jpg';
myImg.onload = function() {
  draw(this);
};

const draw = myImg => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 480;
  canvas.height = 240;

  ctx.drawImage(
    myImg,
    1500,
    1200,
    1920,
    960,
    0,
    0,
    canvas.width,
    canvas.height
  );
  myImg.style.display = 'none';

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  //グレースケール化
  const grayscale = () => {
    for (let i = 0; i < data.length; i += 4) {
      let avg = data[i] + data[i + 1] + data[i + 2] / 3;
      data[i] = avg; //r
      data[i + 1] = avg; //g
      data[i + 2] = avg; //b
    }
    ctx.putImageData(imageData, 0, 0);
  };
  // grayscale();

  //コントラストが弱い場合、コントラスト強くする処理入れる

  //目の画像の2値化
  const thresholding = () => {
    const threshold = 160;
    for (let i = 0; i < data.length; i += 4) {
      let y = ~~(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      let ret = y > threshold ? 255 : 0;
      data[i] = ret;
      data[i + 1] = ret;
      data[i + 2] = ret;
    }
    ctx.putImageData(imageData, 0, 0);
  };
  thresholding();

  //メディアンフィルタ入れる

  //色の差が大きいところを境界線にする
  const outline = () => {
    const outlineColor = { r: 255, g: 0, b: 0 },
      colorDistance = 10;

    for (let i = 0; i < data.length; i += 4) {
      if ((i / 4 + 1) % canvas.width === 0) {
        data[i + 3] = 0;
        continue;
      }

      let currentIndex = i,
        nextIndex = currentIndex + 4,
        underIndex = currentIndex + canvas.width * 4,
        //チェックするピクセルの色
        current = {
          r: data[currentIndex],
          g: data[currentIndex + 1],
          b: data[currentIndex + 2]
        },
        //右隣のピクセルの色
        next = {
          r: data[nextIndex],
          g: data[nextIndex + 1],
          b: data[nextIndex + 2]
        },
        //下のピクセルの色
        under = {
          r: data[underIndex],
          g: data[underIndex + 1],
          b: data[underIndex + 2]
        };

      const getColorDistance = (rgb1, rgb2) => {
        return Math.sqrt(
          Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
        );
      };

      if (
        getColorDistance(current, next) > colorDistance ||
        getColorDistance(current, under) > colorDistance
      ) {
        data[i] = outlineColor.r;
        data[i + 1] = outlineColor.g;
        data[i + 2] = outlineColor.b;
      } else {
        data[i + 3] = 0;
      }
    }
    imageData.data = data;
    ctx.putImageData(imageData, 0, 0);
  };
  outline();

  let array = [];
  const marker = () => {
    let position = { x: 0, y: 0 };

    for (position.x = 0; position.x < canvas.width; position.x += 5) {
      for (position.y = 0; position.y < canvas.height; position.y += 5) {
        let pixelData = ctx.getImageData(position.x, position.y, 1, 1);
        //赤い部分にマーカー
        if (
          pixelData.data[0] === 255 &&
          pixelData.data[1] === 0 &&
          pixelData.data[2] === 0
        ) {
          // console.log('marker' + JSON.stringify(position));
          array.push({ x: position.x, y: position.y });
          ctx.fillStyle = '#0000ff';
          ctx.fillRect(position.x, position.y, 2, 2);
        }
      }
    }
    return array;
  };
  marker();
  console.log('array' + JSON.stringify(array));

  //角度で並べ替え
  const sortByAngle = (map, index) => {
    for (let i = 0; i < map.length; i++) {
      //p0
      let x0 = map[0].x;
      let y0 = map[0].y;
      //p1
      let xi = map[i].x;
      let yi = map[i].y;

      let angle = (Math.atan2(yi - y0, xi - x0) * 180) / Math.PI;
      map[i].angle = angle;
    }
  };
  sortByAngle(array);
  console.log('angle:' + sortByAngle(array));
  console.log(array);

  let path = [];
  //グラハムスキャン
  const grahamScan = map => {
    let k = 0;

    for (var i = 0; i < map.length; ++i) {
      while (true) {
        if (k < 2) {
          break;
        }
        var current = [
          map[path[k - 1]][0] - map[path[k - 2]][0],
          map[path[k - 1]][1] - map[path[k - 2]][1]
        ];
        var next = [
          map[i][0] - map[path[k - 2]][0],
          map[i][1] - map[path[k - 2]][1]
        ];

        function crossVec(v1, v2) {
          return v1[0] * v2[1] - v1[1] * v2[0];
        }

        if (crossVec(current, next) < 0) {
          k--;
        } else {
          break;
        }
      }
      path[k++] = i;
    }
    console.log(path);
    path = path.slice(0, k);
    path.push(path[0]);

    return path;
  };
  grahamScan(array);
};
