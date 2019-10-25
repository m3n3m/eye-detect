//画像を描画する
const myImg = new Image();
myImg.src = './image/eye-closeup02.jpg';
myImg.onload = function() {
  draw(this);
};

const draw = myImg => {
  //背景に元画像を薄く重ねる
  const bg = document.getElementById('bg');
  const ctxBg = bg.getContext('2d');

  const w = 480;
  const h = 240;

  bg.width = w;
  bg.height = h;

  ctxBg.drawImage(myImg, 0, 0, 960, 480, 0, 0, w, h);

  //輪郭検出用の描画を上に重ねる
  const overlay = document.getElementById('overlay');
  const ctx = overlay.getContext('2d');

  overlay.width = w;
  overlay.height = h;

  ctx.drawImage(myImg, 0, 0, 960, 480, 0, 0, w, h);
  myImg.style.display = 'none';

  const imageData = ctx.getImageData(0, 0, w, h);
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
      if ((i / 4 + 1) % w === 0) {
        data[i + 3] = 0;
        continue;
      }

      let currentIndex = i,
        nextIndex = currentIndex + 4,
        underIndex = currentIndex + w * 4,
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

      //2つの色の差
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

  const findCircles = () => {
    let acc_all = []; //各点(x,y)ごとのaccを格納しておく配列。チェックする点の数の分配列が入る。
    //頻度を蓄積するカウンタ
    let acc = [...Array(h)].map(k =>
      [...Array(w)].map(k => [...Array(h)].map(k => 0))
    );

    //TODO:推定する円の最小半径と最大半径を決めて範囲を狭める
    //目の部分を検出してcanvasにしているなら、瞳の半径はcanvasの高さの半分よりは確実に大きい。また、canvasの高さより大きくなることはないはず。と仮定する。

    //2値化した画像から抽出した境界線上の点を格納しておく配列
    let circle_point_candidates = [];

    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        let pixelData = ctx.getImageData(x, y, 1, 1);
        if (
          pixelData.data[0] === 255 ||
          pixelData.data[1] === 255 ||
          pixelData.data[2] === 255
        ) {
          circle_point_candidates.push([x, y]);
          ctx.fillStyle = '#0000ff';
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    for (let i = 0; i < circle_point_candidates.length; i++) {
      //候補点を順番に取り出して確認する
      let circle_y = circle_point_candidates[i][1];
      let circle_x = circle_point_candidates[i][0];

      //円の中心点(p,q)
      const radius = (x, y, p, q) => {
        return ~~Math.sqrt(((x - p) ^ 2) + ((y - q) ^ 2));
      };
      //点(circle_x,circle_y)において円の中心点(center_x,center_y)を変化させるとき
      //radiusがh/2からhの範囲内であれば1を返す
      //もしradiusがh/2より小さければ0を返す
      //radiusがhより大きい場合も0を返す
      //各(circle_x,circle_y)のp,q,rの組み合わせを記した配列を比較して、重複するp,q,rの組みわせを探し出す

      for (let q = 0; q < h; q++) {
        for (let p = 0; p < w; p++) {
          let r = radius(circle_x, circle_y, p, q);
          if (r >= h / 2 && r <= h) {
            acc[q][p][r] = 1;
          }
        }
      }
      acc_all[i] = acc;
      //acc_all[0]とacc_all[1]を比較してみる
      //重なるところがあるかどうか
    }
    testMat = math.add(acc_all[0], acc_all[1]);
    return acc_all;
  };
  // const acc_all = findCircles();
  console.log(acc_all);

  const arr1 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const arr2 = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
  const testMat2 = math.add(arr1, arr2);
  console.log('test:' + testMat2);
};
