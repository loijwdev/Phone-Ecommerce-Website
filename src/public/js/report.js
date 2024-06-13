function formatCurrency(number) {
  return number.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
fetch("/report/getOrderOfWeek")
  .then((response) => response.json())
  .then((data) => {

    const categories = [];
    const seriesData = [];

    data.forEach((item) => {
      categories.push(item._id);
      seriesData.push(item.countOrder);
    });
    // Cập nhật biểu đồ Highcharts
    const chart = Highcharts.chart("container1", {
      chart: {
        type: "line",
      },
      title: {
        text: "Số đơn hàng trong ngày",
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
          text: "Đơn hàng",
        },

        labels: {
          formatter: function () {
            return this.value;
          },
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        formatter: function () {
          return "Đơn hàng: <b>" + this.y + "</b>";
        },
      },

      series: [
        {
          colors: [
            "#20ffc0",
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


  
fetch("/report/getAmountOfWeek")
.then((response) => response.json())
.then((data) => {

  const categories = [];
  const seriesData = [];

  data.forEach((item) => {
    categories.push(item._id);
    seriesData.push(item.total_amount);
  });
  // Cập nhật biểu đồ Highcharts
  const chart = Highcharts.chart("container", {
    chart: {
      type: "bar",
    },
    title: {
      text: "Doanh thu ngày",
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
        text: "Doanh thu",
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
          "#20ffc0",
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


