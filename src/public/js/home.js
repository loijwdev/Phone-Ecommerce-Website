
function formatCurrency(number) {
  return number.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
fetch("/order/getrevenue6m")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    const categories = [];
    const seriesData = [];

    data.forEach((item) => {
      categories.push(item._id);
      seriesData.push(item.totalAmount);
    });
    console.log(seriesData);
    // Cập nhật biểu đồ Highcharts
    const chart = Highcharts.chart("container", {
      chart: {
        type: "column",
      },
      title: {
        text: "Doanh thu 6 tháng gần nhất",
      },
      xAxis: {
        categories,
        labels: {
          autoRotation: [-45, -90],
          style: {
            fontSize: "13px",
            fontFamily: "Verdana, sans-serif",
          },
        },
      },
      yAxis: {
        min: 0,
        title: {
          text: "Doanh thu (VND)",
        },

        labels: {
          formatter: function () {
            return formatCurrency(this.value);
          },
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        formatter: function () {
          return "Doanh thu: <b>" + formatCurrency(this.y) + "</b>";
        },
      },

      series: [
        {
          colors: [
            "#1fccc0",
            "#1f42cc",
            "#861ec9",
            "##1f42cc",
            "#7010f9",
            "#d11154",
          ],
          colorByPoint: true,
          groupPadding: 0,
          data: seriesData,
        },
      ],
      dataLabels: {
        enabled: true,
        rotation: -90,
        color: "#FFFFFF",
        align: "right",
        format: "{point.y:.1f}", // one decimal
        y: 10, // 10 pixels down from the top
        style: {
          fontSize: "13px",
          fontFamily: "Verdana, sans-serif",
        },
      },
    });
  })
  .catch((error) => {
    console.error("Error fetching revenue data:", error);
  });

  fetch("/order/getProductsStatistics")
    .then((response) => response.json())
    .then((data) => {
        console.log(data)
        const chartData = data.map(item => ({
            name: item._id,
            y: item.quantity,
          }));
        ;(function (H) {
            H.seriesTypes.pie.prototype.animate = function (init) {
              const series = this,
                chart = series.chart,
                points = series.points,
                { animation } = series.options,
                { startAngleRad } = series;
          
              function fanAnimate(point, startAngleRad) {
                const graphic = point.graphic,
                  args = point.shapeArgs;
          
                if (graphic && args) {
                  graphic
                    // Set inital animation values
                    .attr({
                      start: startAngleRad,
                      end: startAngleRad,
                      opacity: 1,
                    })
                    // Animate to the final position
                    .animate(
                      {
                        start: args.start,
                        end: args.end,
                      },
                      {
                        duration: animation.duration / points.length,
                      },
                      function () {
                        // On complete, start animating the next point
                        if (points[point.index + 1]) {
                          fanAnimate(points[point.index + 1], args.end);
                        }
                        // On the last point, fade in the data labels, then
                        // apply the inner size
                        if (point.index === series.points.length - 1) {
                          series.dataLabelsGroup.animate(
                            {
                              opacity: 1,
                            },
                            void 0,
                            function () {
                              points.forEach((point) => {
                                point.opacity = 1;
                              });
                              series.update(
                                {
                                  enableMouseTracking: true,
                                },
                                false
                              );
                              chart.update({
                                plotOptions: {
                                  pie: {
                                    innerSize: "40%",
                                    borderRadius: 8,
                                  },
                                },
                              });
                            }
                          );
                        }
                      }
                    );
                }
              }
          
              if (init) {
                // Hide points on init
                points.forEach((point) => {
                  point.opacity = 0;
                });
              } else {
                fanAnimate(points[0], startAngleRad);
              }
            };
          })(Highcharts);
          
          Highcharts.chart("container2", {
            chart: {
              type: "pie",
            },
            title: {
              text: "Các sản phẩm bán chạy",
              align: "left",
            },
            tooltip: {
              pointFormat: "{point.name}: <b>{point.percentage:.1f}%</b>",
            },
            accessibility: {
              point: {
                valueSuffix: "%",
              },
            },
            plotOptions: {
              pie: {
                allowPointSelect: true,
                borderWidth: 2,
                cursor: "pointer",
                dataLabels: {
                  enabled: true,
                  format: "<b>{point.name}</b><br>{point.percentage:.1f}%",
                  distance: 20,
                },
              },
            },
            series: [
              {
                enableMouseTracking: false,
                animation: {
                  duration: 1000,
                },
                colorByPoint: true,
                data: chartData,
              },
            ],
          });
          
    })
