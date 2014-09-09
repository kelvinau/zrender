/**
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         pissang(https://github.com/pissang)
 *         errorrik (errorrik@gmail.com)
 */
define(
    function (require) {
        var vec2 = require('./vector');
        var curve = require('./curve');

        /**
         * 从顶点数组中计算出最小包围盒，写入`min`和`max`中
         * @module zrender/tool/computeBoundingBox
         * @param {Array<Object>} points 顶点数组
         * @param {number} min
         * @param {number} max
         */
        function computeBoundingBox(points, min, max) {
            if (points.length === 0) {
                return;
            }
            var left = points[0][0];
            var right = points[0][0];
            var top = points[0][1];
            var bottom = points[0][1];
            
            for (var i = 1; i < points.length; i++) {
                var p = points[i];
                if (p[0] < left) {
                    left = p[0];
                }
                if (p[0] > right) {
                    right = p[0];
                }
                if (p[1] < top) {
                    top = p[1];
                }
                if (p[1] > bottom) {
                    bottom = p[1];
                }
            }

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * 从三阶贝塞尔曲线(p0, p1, p2, p3)中计算出最小包围盒，写入`min`和`max`中
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} p0
         * @param {Array.<number>} p1
         * @param {Array.<number>} p2
         * @param {Array.<number>} p3
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        function computeCubeBezierBoundingBox(p0, p1, p2, p3, min, max) {
            var xDim = [];
            curve.cubicExtrema(p0[0], p1[0], p2[0], p3[0], xDim);
            for (var i = 0; i < xDim.length; i++) {
                xDim[i] = curve.cubicAt(p0[0], p1[0], p2[0], p3[0], xDim[i]);
            }
            var yDim = [];
            curve.cubicExtrema(p0[1], p1[1], p2[1], p3[1], yDim);
            for (var i = 0; i < yDim.length; i++) {
                yDim[i] = curve.cubicAt(p0[1], p1[1], p2[1], p3[1], yDim[i]);
            }

            xDim.push(p0[0], p3[0]);
            yDim.push(p0[1], p3[1]);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * 从二阶贝塞尔曲线(p0, p1, p2)中计算出最小包围盒，写入`min`和`max`中
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} p0
         * @param {Array.<number>} p1
         * @param {Array.<number>} p2
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        function computeQuadraticBezierBoundingBox(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var t1 = curve.quadraticExtremum(p0[0], p1[0], p2[0]);
            var t2 = curve.quadraticExtremum(p0[1], p1[1], p2[1]);

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1 - t1;
            var ct2 = 1 - t2;

            var x1 = ct1 * ct1 * p0[0] 
                     + 2 * ct1 * t1 * p1[0] 
                     + t1 * t1 * p2[0];
            var y1 = ct1 * ct1 * p0[1] 
                     + 2 * ct1 * t1 * p1[1] 
                     + t1 * t1 * p2[1];

            var x2 = ct2 * ct2 * p0[0] 
                     + 2 * ct2 * t2 * p1[0] 
                     + t2 * t2 * p2[0];
            var y2 = ct2 * ct2 * p0[1] 
                     + 2 * ct2 * t2 * p1[1] 
                     + t2 * t2 * p2[1];

            return computeBoundingBox(
                        [ p0.slice(), p2.slice(), [ x1, y1 ], [ x2, y2 ] ],
                        min, max
                    );
        }

        /**
         * 从圆弧中计算出最小包围盒，写入`min`和`max`中
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} center 圆弧中心点
         * @param {number} radius 圆弧半径
         * @param {number} startAngle 圆弧开始角度
         * @param {number} endAngle 圆弧结束角度
         * @param {number} clockwise 是否是顺时针
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        var computeArcBoundingBox = (function () {
            var start = [];
            var end = [];
            // At most 4 extremities
            var extremities = [[], [], [], []];
            return function (
                center, radius, startAngle, endAngle, clockwise, min, max
            ) {
                clockwise = clockwise ? 1 : -1;
                start[0] = Math.cos(startAngle);
                start[1] = Math.sin(startAngle) * clockwise;
                vec2.scale(start, start, radius);
                vec2.add(start, start, center);

                end[0] = Math.cos(endAngle);
                end[1] = Math.sin(endAngle) * clockwise;
                vec2.scale(end, end, radius);
                vec2.add(end, end, center);
                
                startAngle = startAngle % (Math.PI * 2);
                if (startAngle < 0) {
                    startAngle = startAngle + Math.PI * 2;
                }
                endAngle = endAngle % (Math.PI * 2);
                if (endAngle < 0) {
                    endAngle = endAngle + Math.PI * 2;
                }

                if (startAngle > endAngle) {
                    endAngle += Math.PI * 2;
                }
                var number = 0;
                for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                    if (angle > startAngle) {
                        var extremity = extremities[number++];
                        extremity[0] = Math.cos(angle);
                        extremity[1] = Math.sin(angle) * clockwise;
                        vec2.scale(extremity, extremity, radius);
                        vec2.add(extremity, extremity, center);
                    }
                }
                var points = extremities.slice(0, number);
                points.push(start, end);
                computeBoundingBox(points, min, max);
            };
        })();

        computeBoundingBox.cubeBezier = computeCubeBezierBoundingBox;
        computeBoundingBox.quadraticBezier = computeQuadraticBezierBoundingBox;
        computeBoundingBox.arc = computeArcBoundingBox;

        return computeBoundingBox;
    }
);
