nv.models.controlChart = function () {
  "use strict";

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = { top: 30, right: 20, bottom: 50, left: 60 },
      color = nv.utils.defaultColor(),
      width = null,
      height = null,
      showLegend = true,
      noData = null,
      yDomain1,
      yDomain2,
      getX = function (d) { return d.x },
      getY = function (d) { return d.y },
      interpolate = 'monotone',
      useVoronoi = true,
      interactiveLayer = nv.interactiveGuideline(),
      useInteractiveGuideline = false,
      legendRightAxisHint = ' (right axis)'
       , controlLines = function (d) { return d.controlLines; }
  ;

  //============================================================
  // Private Variables
  //------------------------------------------------------------
  var x = d3.scale.linear(),
      yScale1 = d3.scale.linear(),
      yScale2 = d3.scale.linear(),

      lines1 = nv.models.line().yScale(yScale1),
      lines2 = nv.models.line().yScale(yScale2),

      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis1 = nv.models.axis().scale(yScale1).orient('left'),
      yAxis2 = nv.models.axis().scale(yScale2).orient('right'),

      legend = nv.models.legend().height(30),
      tooltip = nv.models.tooltip(),
      dispatch = d3.dispatch();

  var charts = [lines1, lines2];

  function chart(selection) {
    selection.each(function (data) {
      var container = d3.select(this),
          that = this;
      nv.utils.initSVG(container);

      chart.update = function () { container.transition().call(chart); };
      chart.container = this;

      var availableWidth = nv.utils.availableWidth(width, container, margin),
          availableHeight = nv.utils.availableHeight(height, container, margin);

      var dataLines1 = data.filter(function (d) { return d.type == 'line' && d.yAxis == 1 });
      var dataLines2 = data.filter(function (d) { return d.type == 'line' && d.yAxis == 2 });

      // Display noData message if there's nothing to show.
      if (!data || !data.length || !data.filter(function (d) { return d.values.length }).length) {
        nv.utils.noData(chart, container);
        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      var series1 = data.filter(function (d) { return !d.disabled && d.yAxis == 1 })
          .map(function (d) {
            return d.values.map(function (d, i) {
              return { x: getX(d), y: getY(d) }
            })
          });

      var series2 = data.filter(function (d) { return !d.disabled && d.yAxis == 2 })
          .map(function (d) {
            return d.values.map(function (d, i) {
              return { x: getX(d), y: getY(d) }
            })
          });

      x.domain(d3.extent(d3.merge(series1.concat(series2)), function (d) { return getX(d) }))
          .range([0, availableWidth]);

      var wrap = container.selectAll('g.wrap.multiChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiChart').append('g');

      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y1 nv-axis');
      gEnter.append('g').attr('class', 'nv-y2 nv-axis');
      gEnter.append('g').attr('class', 'lines1Wrap');
      gEnter.append('g').attr('class', 'lines2Wrap');
      gEnter.append('g').attr('class', 'controls1Wrap');
      gEnter.append('g').attr('class', 'controls2Wrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'nv-interactive');

      var g = wrap.select('g');

      var color_array = data.map(function (d, i) {
        return data[i].color || color(d, i);
      });

      if (showLegend) {
        var legendWidth = legend.align() ? availableWidth / 2 : availableWidth;
        var legendXPosition = legend.align() ? legendWidth : 0;

        legend.width(legendWidth);
        legend.color(color_array);

        g.select('.legendWrap')
            .datum(data.map(function (series) {
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey + (series.yAxis == 1 ? '' : legendRightAxisHint);
              return series;
            }))
            .call(legend);

        if (margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = nv.utils.availableHeight(height, container, margin);
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + legendXPosition + ',' + (-margin.top) + ')');
      }

      lines1
          .width(availableWidth)
          .height(availableHeight)
          .interpolate(interpolate)
          .color(color_array.filter(function (d, i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'line' }));
      lines2
          .width(availableWidth)
          .height(availableHeight)
          .interpolate(interpolate)
          .color(color_array.filter(function (d, i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'line' }));
      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var lines1Wrap = g.select('.lines1Wrap')
          .datum(dataLines1.filter(function (d) { return !d.disabled }));
      var lines2Wrap = g.select('.lines2Wrap')
          .datum(dataLines2.filter(function (d) { return !d.disabled }));

      var controls1 = dataLines1
        .filter(function(data) {
          return !data.disabled;
        })
        .map(function (a) {
          return a.controlLines;
        });
      var extraValue1 = controls1.length ? [
        {
          x: 0,
          y: Math.min.apply(null, controls1.map(function(control) {
            return Math.floor(control[1].value * 100)/100;
          }))
        }] : [];
      if (controls1.length === 3) {
        extraValue1.push({
          x: 0,
          y: Math.max.apply(null, controls1.map(function(control) {
            return Math.ceil(control[2].value * 100) / 100;
          }))
        });
      }
      var controls2 = dataLines2
          .filter(function(data) {
            return !data.disabled;
          })
          .map(function (a) {
            return a.controlLines;
          });

      var extraValue2 = controls2.length ? [
        {
          x: 0,
          y: Math.min.apply(null, controls2.map(function(control) {
            return Math.floor(control[0].value * 100) / 100;
          }))
        }, {
          x: 0,
          y: Math.max.apply(null, controls2.map(function(control) {
            return Math.ceil(control[4].value * 100) / 100;
          }))
        }] : [];

  
      yScale1.domain(yDomain1 || d3.extent(d3.merge(series1).concat(extraValue1), function (d) { return d.y }))
          .range([0, availableHeight]);

      yScale2.domain(yDomain2 || d3.extent(d3.merge(series2).concat(extraValue2), function (d) { return d.y }))
          .range([0, availableHeight]);

      lines1.yDomain(yScale1.domain());

      lines2.yDomain(yScale2.domain());

      if (dataLines1.length) { d3.transition(lines1Wrap).call(lines1); }
      if (dataLines2.length) { d3.transition(lines2Wrap).call(lines2); }

      var controlLineData1 = data.filter(function (d) {
        return !d.disabled && !!controlLines(d) && (d.yAxis === 1);
      });

      var controlLines1Outer = g.select(".controls1Wrap").selectAll("g")
        .data(controlLineData1, function(d) { return d.key; });
      controlLines1Outer.enter().append("g");
      var controlLines1 = controlLines1Outer.selectAll("line")
        .data(function(d, i) {
          return d.controlLines;
        });
      var controlLines1Labels = controlLines1Outer.selectAll("text")
        .data(function (d, i) {
          return d.controlLines;
        });
      //updateYAxis();
      var getControlLineY1 = function (d) {
        //If average lines go off the svg element, clamp them to the svg bounds.
        var yVal = yScale1(d.value);
        if (yVal < 0) return 0;
        if (yVal > availableHeight) return availableHeight;
        return yVal;
      };

      controlLines1.enter()
        .append('line')
        .style('stroke-width', 0.5)
        .style('stroke-dasharray', '5,5')
        .style('stroke', function (d, i) {
          return lines1.color()(d, d.seriesIndex);
        })
        .style('opacity',0.5)
          .attr('x1', 0)
          .attr('x2', availableWidth)
          .attr('y1', getControlLineY1)
          .attr('y2', getControlLineY1);
      controlLines1
        .attr('x', availableWidth)
        .attr('y', getControlLineY1)

          .attr('x1', 0)
          .attr('x2', availableWidth)
          .attr('y1', getControlLineY1)
          .attr('y2', getControlLineY1);
      controlLines1.exit().remove();

      controlLines1Labels.enter()
        .append('text')
        .attr('x', availableWidth)
        .attr('y', getControlLineY1)
        .text(function(d) {
          return d.line;
        });
      controlLines1Labels
        .attr('x', availableWidth)
        .attr('y', getControlLineY1)
        .text(function (d) {
          return d.line;
        });
      controlLines1Labels.exit().remove();

      var controlLineData2 = data.filter(function (d) {
        return !d.disabled && !!controlLines(d) && (d.yAxis === 2);
      });

      var controlLines2 = g.select(".controls2Wrap").selectAll("line")
          .data(controlLineData2, function (d) { return d.key; });

      //updateYAxis();
      var getControlLineY2 = function (d) {
        //If average lines go off the svg element, clamp them to the svg bounds.
        var yVal = yScale2(d.controlLines[2].value);
        if (yVal < 0) return 0;
        if (yVal > availableHeight) return availableHeight;
        return yVal;
      };

      controlLines2.enter()
        .append('line')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '10,10')
        .style('stroke', function (d, i) {
          return lines1.color()(d, d.seriesIndex);
        })
          .attr('x1', 0)
          .attr('x2', availableWidth)
          .attr('y1', getControlLineY2)
          .attr('y2', getControlLineY2);
      controlLines2
          .attr('x1', 0)
          .attr('x2', availableWidth)
          .attr('y1', getControlLineY2)
          .attr('y2', getControlLineY2);
      controlLines2.exit().remove();

      xAxis
          ._ticks(nv.utils.calcTicksX(availableWidth / 100, data))
          .tickSize(-availableHeight, 0);

      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

      yAxis1
          ._ticks(nv.utils.calcTicksY(availableHeight / 36, data))
          .tickSize(-availableWidth, 0);


      d3.transition(g.select('.nv-y1.nv-axis'))
          .call(yAxis1);

      yAxis2
          ._ticks(nv.utils.calcTicksY(availableHeight / 36, data))
          .tickSize(-availableWidth, 0);

      d3.transition(g.select('.nv-y2.nv-axis'))
          .call(yAxis2);

      g.select('.nv-y1.nv-axis')
          .classed('nv-disabled', series1.length ? false : true)
          .attr('transform', 'translate(' + x.range()[0] + ',0)');

      g.select('.nv-y2.nv-axis')
          .classed('nv-disabled', series2.length ? false : true)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

      legend.dispatch.on('stateChange', function (newState) {
        chart.update();
      });

      if (useInteractiveGuideline) {
        interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({ left: margin.left, top: margin.top })
            .svgContainer(container)
            .xScale(x);
        wrap.select(".nv-interactive").call(interactiveLayer);
      }

      //============================================================
      // Event Handling/Dispatching
      //------------------------------------------------------------

      function mouseover_line(evt) {
        var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
        evt.value = evt.point.x;
        evt.series = {
          value: evt.point.y,
          color: evt.point.color,
          key: evt.series.key
        };
        tooltip
            .duration(0)
            .valueFormatter(function (d, i) {
              return yaxis.tickFormat()(d, i);
            })
            .data(evt)
            .hidden(false);
      }

      function mouseover_scatter(evt) {
        var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
        evt.value = evt.point.x;
        evt.series = {
          value: evt.point.y,
          color: evt.point.color,
          key: evt.series.key
        };
        tooltip
            .duration(100)
            .valueFormatter(function (d, i) {
              return yaxis.tickFormat()(d, i);
            })
            .data(evt)
            .hidden(false);
      }

      function mouseover_stack(evt) {
        var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
        evt.point['x'] = stack1.x()(evt.point);
        evt.point['y'] = stack1.y()(evt.point);
        tooltip
            .duration(0)
            .valueFormatter(function (d, i) {
              return yaxis.tickFormat()(d, i);
            })
            .data(evt)
            .hidden(false);
      }

      function mouseover_bar(evt) {
        var yaxis = data[evt.data.series].yAxis === 2 ? yAxis2 : yAxis1;

        evt.value = bars1.x()(evt.data);
        evt['series'] = {
          value: bars1.y()(evt.data),
          color: evt.color,
          key: evt.data.key
        };
        tooltip
            .duration(0)
            .valueFormatter(function (d, i) {
              return yaxis.tickFormat()(d, i);
            })
            .data(evt)
            .hidden(false);
      }



      function clearHighlights() {
        for (var i = 0, il = charts.length; i < il; i++) {
          var chart = charts[i];
          try {
            chart.clearHighlights();
          } catch (e) { }
        }
      }

      function highlightPoint(serieIndex, pointIndex, b) {
        for (var i = 0, il = charts.length; i < il; i++) {
          var chart = charts[i];
          try {
            chart.highlightPoint(serieIndex, pointIndex, b);
          } catch (e) { }
        }
      }

      if (useInteractiveGuideline) {
        interactiveLayer.dispatch.on('elementMousemove', function (e) {
          clearHighlights();
          var singlePoint, pointIndex, pointXLocation, allData = [];
          data
          .filter(function (series, i) {
            series.seriesIndex = i;
            return !series.disabled;
          })
          .forEach(function (series, i) {
            var extent = x.domain();
            var currentValues = series.values.filter(function (d, i) {
              return chart.x()(d, i) >= extent[0] && chart.x()(d, i) <= extent[1];
            });

            pointIndex = nv.interactiveBisect(currentValues, e.pointXValue, chart.x());
            var point = currentValues[pointIndex];
            var pointYValue = chart.y()(point, pointIndex);
            if (pointYValue !== null) {
              highlightPoint(i, pointIndex, true);
            }
            if (point === undefined) return;
            if (singlePoint === undefined) singlePoint = point;
            if (pointXLocation === undefined) pointXLocation = x(chart.x()(point, pointIndex));
            allData.push({
              key: series.key,
              value: pointYValue,
              color: color(series, series.seriesIndex),
              data: point,
              yAxis: series.yAxis == 2 ? yAxis2 : yAxis1,
              controls: series.controls
            });
          });

          interactiveLayer.tooltip
          .valueFormatter(function (d, i) {
            var yAxis = allData[i].yAxis;
            return d === null ? "N/A" : allData[i].yAxis.tickFormat()(d);
          }).headerFormatter(function (d, i) {
            return xAxis.tickFormat()(d, i);
          })
          .data({
            value: chart.x()(singlePoint, pointIndex),
            index: pointIndex,
            series: allData
          })();

          interactiveLayer.renderGuideLine(pointXLocation);
        });

        interactiveLayer.dispatch.on("elementMouseout", function (e) {
          clearHighlights();
        });
      } else {
        lines1.dispatch.on('elementMouseover.tooltip', mouseover_line);
        lines2.dispatch.on('elementMouseover.tooltip', mouseover_line);
        lines1.dispatch.on('elementMouseout.tooltip', function (evt) {
          tooltip.hidden(true)
        });
        lines2.dispatch.on('elementMouseout.tooltip', function (evt) {
          tooltip.hidden(true)
        });

      }
    });

    return chart;
  }

  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines1 = lines1;
  chart.lines2 = lines2;
  chart.xAxis = xAxis;
  chart.yAxis1 = yAxis1;
  chart.yAxis2 = yAxis2;
  chart.tooltip = tooltip;
  chart.interactiveLayer = interactiveLayer;

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    // simple options, just get/set the necessary values
    width: { get: function () { return width; }, set: function (_) { width = _; } },
    height: { get: function () { return height; }, set: function (_) { height = _; } },
    showLegend: { get: function () { return showLegend; }, set: function (_) { showLegend = _; } },
    yDomain1: { get: function () { return yDomain1; }, set: function (_) { yDomain1 = _; } },
    yDomain2: { get: function () { return yDomain2; }, set: function (_) { yDomain2 = _; } },
    noData: { get: function () { return noData; }, set: function (_) { noData = _; } },
    interpolate: { get: function () { return interpolate; }, set: function (_) { interpolate = _; } },
    legendRightAxisHint: { get: function () { return legendRightAxisHint; }, set: function (_) { legendRightAxisHint = _; } },

    // options that require extra logic in the setter
    margin: {
      get: function () { return margin; }, set: function (_) {
        margin.top = _.top !== undefined ? _.top : margin.top;
        margin.right = _.right !== undefined ? _.right : margin.right;
        margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
        margin.left = _.left !== undefined ? _.left : margin.left;
      }
    },
    color: {
      get: function () { return color; }, set: function (_) {
        color = nv.utils.getColor(_);
      }
    },
    x: {
      get: function () { return getX; }, set: function (_) {
        getX = _;
        lines1.x(_);
        lines2.x(_);
      }
    },
    y: {
      get: function () { return getY; }, set: function (_) {
        getY = _;
        lines1.y(_);
        lines2.y(_);
      }
    },
    useVoronoi: {
      get: function () { return useVoronoi; }, set: function (_) {
        useVoronoi = _;
        lines1.useVoronoi(_);
        lines2.useVoronoi(_);
      }
    },

    useInteractiveGuideline: {
      get: function () { return useInteractiveGuideline; }, set: function (_) {
        useInteractiveGuideline = _;
        if (useInteractiveGuideline) {
          lines1.interactive(false);
          lines1.useVoronoi(false);
          lines2.interactive(false);
          lines2.useVoronoi(false);
        }
      }
    },
    controlLines: { get: function () { return controlLines; }, set: function (_) { controlLines = _; } },

  });

  nv.utils.initOptions(chart);

  return chart;
};