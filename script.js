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

  //画像の2値化
  const thresholding = () => {
    const threshold = 160;
    for (let i = 0; i < data.length; i += 4) {
      let avg = ~~(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      let color = avg > threshold ? 255 : 0;
      data[i] = color;
      data[i + 1] = color;
      data[i + 2] = color;
    }
    ctx.putImageData(imageData, 0, 0);
  };
  thresholding();

  //2値化した画像の内側の白を黒に置き換えられるかどうか
  const erosion = () => {
    for (let i = 0; i < data.length; i += 4) {
      if ((i / 4 + 1) % w === 0) {
        data[i + 3] = 0;
        continue;
      }

      let currentIndex = i,
        prevIndex = currentIndex - 4,
        nextIndex = currentIndex + 4,
        topIndex = currentIndex - w * 4,
        bottomIndex = currentIndex + w * 4,
        //チェックするピクセルの色
        current = {
          r: data[currentIndex],
          g: data[currentIndex + 1],
          b: data[currentIndex + 2]
        },
        //左隣のピクセルの色
        prev = {
          r: data[prevIndex],
          g: data[prevIndex + 1],
          b: data[prevIndex + 2]
        },
        //右隣のピクセルの色
        next = {
          r: data[nextIndex],
          g: data[nextIndex + 1],
          b: data[nextIndex + 2]
        },
        //上のピクセルの色
        top = {
          r: data[topIndex],
          g: data[topIndex + 1],
          b: data[topIndex + 2]
        },
        //下のピクセルの色
        bottom = {
          r: data[bottomIndex],
          g: data[bottomIndex + 1],
          b: data[bottomIndex + 2]
        };

      //水平方向
      if (prev.r === 0 && next.r === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      } else {
        data[i + 3] = 0;
      }
      //垂直方向
      if (top.r === 0 && bottom.r === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      } else {
        data[i + 3] = 0;
      }
    }
    imageData.data = data;
    ctx.putImageData(imageData, 0, 0);
  };
  // erosion();

  //輪郭線
  //色の差の大きいところを輪郭線にする
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

  //輪郭線上から候補点
  //2値化した画像から抽出した境界線上の点を格納しておく配列
  let circle_point_candidates = [];
  const markers = () => {
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
    // console.log(circle_point_candidates);
    return circle_point_candidates;
  };
  markers();

  //scan convex hull
  const convexHull = points => {
    const p = points;
    let temp = [];
    let temp1 = [];

    //点の候補をyでソートする
    const sortByY = _.sortBy(points, [
      function(arr) {
        return arr[1];
      }
    ]);

    let acc = [sortByY[0]];

    // console.log(p);
    // console.log(sortByY);
    // console.log(acc);

    //角度順でソートする
    for (let j = 1; j < sortByY.length; j++) {
      let p0 = sortByY[0];
      let p1 = sortByY[j];

      let x = p1[0] - p0[0];
      let y = p1[1] - p0[1];

      let theta = Math.atan2(-y, x);

      if (theta < 0) {
        theta += 2 * Math.PI;
      }
      theta = ~~(360 - (theta * 180) / Math.PI);

      if (theta >= 360) {
        theta = theta - 360;
      }
      temp.push(_.concat(sortByY[j], theta));
    }
    let sortByTheta = _.sortBy(temp, [
      function(arr) {
        return arr[arr.length - 1];
      }
    ]);
    let point = _.chunk(sortByTheta[0], 2)[0];
    acc.push(point);
    console.log(sortByTheta);
    console.log(acc);

    for (let j = 1; j < sortByTheta.length; j++) {
      let p0 = sortByTheta[0];
      let p1 = sortByTheta[j];

      let x = p1[0] - p0[0];
      let y = p1[1] - p0[1];

      let theta = Math.atan2(-y, x);

      if (theta < 0) {
        theta += 2 * Math.PI;
      }
      theta = ~~(360 - (theta * 180) / Math.PI);

      if (theta >= 360) {
        theta = theta - 360;
      }
      //角度を配列に追加
      temp1.push(_.concat(sortByTheta[j], theta));
    }
    sortByTheta = _.sortBy(temp1, [
      function(arr) {
        return arr[arr.length - 1];
      }
    ]);
    console.log(sortByTheta);
    point = _.chunk(sortByTheta[0], 2)[0];
    acc.push(point);
  };
  convexHull(circle_point_candidates);

  //ハフ変換
  const findCircles = () => {
    let acc_all = []; //各点(x,y)ごとのaccを格納しておく配列。
    let acc = [...Array(h)].map(k =>
      [...Array(w)].map(k => [...Array(h)].map(k => 0))
    );

    let circle_center_candidates = [];

    const max_x = _.maxBy(circle_point_candidates, function(point) {
      return point[0];
    })[0];
    const min_x = _.minBy(circle_point_candidates, function(point) {
      return point[0];
    })[0];
    const max_y = _.maxBy(circle_point_candidates, function(point) {
      return point[1];
    })[1];
    const min_y = _.minBy(circle_point_candidates, function(point) {
      return point[1];
    })[1];

    //青い点を通る円の中心点
    for (let i = 0; i < circle_point_candidates.length; i++) {
      //候補点(x,y)を順番に取り出して確認する
      let circle_y = circle_point_candidates[i][1];
      let circle_x = circle_point_candidates[i][0];

      //円の中心点(p,q)
      const radius = (x, y, p, q) => {
        return ~~Math.sqrt((x - p) * (x - p) + (y - q) * (y - q));
      };

      for (let q = min_y; q < max_y; q++) {
        for (let p = min_x; p < max_x; p++) {
          let r = radius(circle_x, circle_y, p, q);
          const max_r = (max_x - min_x) / 2;
          if (r >= max_r * 0.7 && r < max_r) {
            acc[q][p][r] = 1;
            circle_center_candidates.push({ p: p, q: q, r: r });
          }
        }
      }
      acc_all[i] = acc;
    }

    const sortByP = _.sortBy(circle_center_candidates, [
      function(obj) {
        return obj.p;
      }
    ]);
    const sortByQ = _.sortBy(sortByP, [
      function(obj) {
        return obj.q;
      }
    ]);
    const sortByR = _.sortBy(sortByQ, [
      function(obj) {
        return obj.r;
      }
    ]);

    // console.log(JSON.stringify(sortByR[0]) == JSON.stringify(sortByR[1]));
    let counts = {};
    for (let i = 0; i < sortByR.length; i++) {
      let key = JSON.stringify(sortByR[i]);
      counts[key] = counts[key] ? counts[key] + 1 : 1;
    }
    // console.log(JSON.stringify(sortByR[1000]));
    // console.log(counts[JSON.stringify(sortByR[1000])]);
    // console.log(Object.keys(counts)[0]);

    // let acc_counts = [];
    // for (let i = 0; i < sortByR.length; i++) {
    //   acc_counts.push(counts[JSON.stringify(sortByR[i])]);
    // }
    // console.log('counts_max: ' + _.max(acc_counts));

    let invArr = _.invert(counts);
    // console.log(invArr);
    // console.log(Object.keys(invArr)[0]);
    // console.log(Object.keys(invArr).length);
    // console.log(invert['8']);

    for (let i = 5; i <= Object.keys(invArr).length; i++) {
      const circle = JSON.parse(invArr[i]);
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.arc(circle.p, circle.q, circle.r, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = 'green';
      ctx.fillRect(circle.p, circle.q, 4, 4);
    }

    return acc_all;
  };
  findCircles();
};
