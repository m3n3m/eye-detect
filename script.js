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

  // 輪郭追跡を行い，輪郭部のみに色を出力する
  const contourDetection = (contextOut, width, height) => {
    // 読み取り用ピクセルデータ（書き換えない）
    const pixelData = new Array(width);
    for (let i = 0; i < width; ++i) {
      pixelData[i] = new Array(height);
      for (let j = 0; j < height; ++j) {
        pixelData[i][j] = data[4 * (width * j + i)];
      }
    }
    // 更新用ピクセルデータ
    const buf = new Array(width);
    for (let i = 0; i < width; ++i) {
      buf[i] = new Array(height);
      for (let j = 0; j < height; ++j) {
        buf[i][j] = 255;
      }
    }

    // あるピクセルを * で表し、
    // 周囲のピクセルを下のように番号を付けて表す
    // 3 2 1
    // 4 * 0
    // 5 6 7
    let nextCode = [7, 7, 1, 1, 3, 3, 5, 5];
    // Freeman's chain code
    let chainCode = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1]
    ];

    let rel; // relativee pisition
    let relBuf; // previous rel
    let dPx = []; // detected pixel 輪郭として検出されたピクセルのテンポラリー変数
    let startPx = []; // 輪郭追跡の開始ピクセル
    let sPx = []; // searching pixel
    let isClosed = false; // 輪郭が閉じていれば true
    let isStandAlone; // 孤立点ならば true
    let pxs = []; // 輪郭のピクセル座標の配列を格納するテンポラリー配列
    let boundaryPxs = []; // 複数の輪郭を格納する配列
    let pxVal; // 着目するピクセルの色
    let duplicatedPx = []; // 複数回、輪郭として検出されたピクセル座標を格納（将来的にこのような重複を許さないアルゴリズムにしたい）
    while (1) {
      // 輪郭追跡開始ピクセルを探す
      dPx = searchStartPixel();
      // 画像全体が検索された場合はループを終了
      if (dPx[0] == width && dPx[1] == height) {
        break;
      }
      pxs = [];
      pxs.push([dPx[0], dPx[1]]);
      startPx = [dPx[0], dPx[1]];
      isStandAlone = false;
      isClosed = false;
      relBuf = 5; // 最初に調べるのは5番
      // 輪郭が閉じるまで次々に周囲のピクセルを調べる
      while (!isClosed) {
        for (let i = 0; i < 8; ++i) {
          rel = (relBuf + i) % 8; // relBufから順に調べる
          sPx[0] = dPx[0] + chainCode[rel][0];
          sPx[1] = dPx[1] + chainCode[rel][1];
          // sPx が画像上の座標外ならば白として評価する
          if (sPx[0] < 0 || sPx[0] >= width || sPx[1] < 0 || sPx[1] >= height) {
            pxVal = 255;
          } else {
            pxVal = pixelData[sPx[0]][sPx[1]];
          }
          // もし調べるピクセルの色が黒ならば新しい輪郭とみなす
          // 最初のピクセルに戻れば次の輪郭を探す
          // 周囲の8ピクセルがすべて白ならば孤立点なので次の輪郭を探す
          if (pxVal == 0) {
            if (buf[sPx[0]][sPx[1]] == 0) {
              duplicatedPx.push([sPx[0], sPx[1]]);
            }
            // 検出されたピクセルが輪郭追跡開始ピクセルならば
            // 追跡を終了して次の輪郭に移る
            if (sPx[0] == startPx[0] && sPx[1] == startPx[1]) {
              isClosed = true;
              break;
            }
            buf[sPx[0]][sPx[1]] = 0; // 検出された点を黒にする
            dPx[0] = sPx[0];
            dPx[1] = sPx[1];
            pxs.push([dPx[0], dPx[1]]);
            relBuf = nextCode[rel];
            break;
          }
          if (i == 7) {
            isStandAlone = true;
          }
        }
        if (isStandAlone) {
          break;
        }
      }
      boundaryPxs.push(pxs);
    }

    // 左上から操作し開始点（白から黒に代わるピクセル）を見つける
    function searchStartPixel() {
      let x, y;
      let leftPx;
      for (y = 0; y < height; ++y) {
        for (x = 0; x < width; ++x) {
          if (x == 0) {
            leftPx = 255;
          } else {
            leftPx = pixelData[x - 1][y];
          }
          if (leftPx == 255 && pixelData[x][y] == 0 && buf[x][y] == 255) {
            buf[x][y] = 0;
            return [x, y];
          }
        }
      }
      return [width, height];
    }

    // 輪郭ごとに色を変えて描画する
    contextOut.clearRect(0, 0, width, height);
    colors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan'];
    for (let i = 0; i < boundaryPxs.length; ++i) {
      contextOut.strokeStyle = colors[i % colors.length];
      contextOut.beginPath();
      contextOut.moveTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
      for (let j = 1; j < boundaryPxs[i].length; ++j) {
        contextOut.lineTo(boundaryPxs[i][j][0], boundaryPxs[i][j][1]);
      }
      contextOut.lineTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
      contextOut.stroke();
    }
    contextOut.strokeStyle = 'black';
  };
  contourDetection(ctx, canvas.width, canvas.height);
};
