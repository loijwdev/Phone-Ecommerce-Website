$("#refreshButton").click(function () {
  cartState = {};
  clearCart();
});
$(".copySubTotal").click(function () {
  const totalAmount = $("#amount").text();
  $("#cash").val(totalAmount);
  if (totalAmount) handleCashChange();
});
$("#cash").on("input", function () {
  handleCashChange();
});
$(".copySubTotalCK").click(function () {
  const totalAmount = $("#amount").text();
  $("#moneyTransfer").val(totalAmount);
  if (totalAmount) handleTransferChange();
});
$("#moneyTransfer").on("input", function () {
  handleTransferChange();
});

$("#btnSaveCustomer").click(function () {
  const customerMobile = $("#customerMobile").val();
  const customerName = $("#customerName").val();

  if (customerMobile.trim() === "") {
    $("#msg3").css("display", "block");
    setTimeout(function () {
      $("#msg3").css("display", "none");
    }, 3000);
    return;
  }

  const newCustomer = {
    name: customerName,
    phone: customerMobile,
  };

  // Make a POST request to create a new customer
  fetch("/customer/createCustomer", {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(newCustomer),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        $("#customerId").val(data.customer._id);
        $("#msg4").css("display", "block");
        setTimeout(function () {
          $("#msg4").css("display", "none");
        }, 3000);
      } else {
        $("#msg5").css("display", "block");
        setTimeout(function () {
          $("#msg5").css("display", "none");
        }, 3000);
        $("#customerId").val(data.customer._id);
        $("#customerName").val(data.customer.name);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

function handleCashChange() {
  const totalAmount = parseFloat($("#amount").text().replace(/\./g, ""));
  let cashValue = parseFloat($("#cash").val().replace(/\./g, ""));
  if (isNaN(cashValue)) {
    cashValue = 0;
  }
  const remainMoney = cashValue - totalAmount;
  const absoluteRemainMoney = Math.abs(remainMoney);

  if (remainMoney < 0) {
    $("#remainMoneyPositive").hide();
    $("#remainMoneyNegative").show();
  } else {
    $("#remainMoneyPositive").show();
    $("#remainMoneyNegative").hide();
  }

  $("#remainMoney").text(formatCurrency(absoluteRemainMoney));
}

function handleTransferChange() {
  const totalAmount = parseFloat($("#amount").text().replace(/\./g, ""));
  let Transfer = parseFloat($("#moneyTransfer").val().replace(/\./g, ""));

  if (isNaN(Transfer)) {
    Transfer = 0;
  }

  const remainMoney = Transfer - totalAmount;
  const absoluteRemainMoney = Math.abs(remainMoney);

  if (remainMoney < 0) {
    $("#remainMoneyPositive").hide();
    $("#remainMoneyNegative").show();
  } else {
    $("#remainMoneyPositive").show();
    $("#remainMoneyNegative").hide();
  }

  $("#remainMoney").text(formatCurrency(absoluteRemainMoney));
}

function setupDeleteProductListener() {
  $("#cartTable tbody").on("click", "i#deleteProductCart", function () {
    const row = $(this).closest("tr");
    const productName = row.find("td:nth-child(2)").text();

    $.post("/pos/removeFromCart", { productName }, function (data) {
      if (data.success) {
        delete cartState[productName];
        row.remove();
        //displayShoppingCart()
        calculateCart();
        sessionStorage.setItem("cartState", JSON.stringify(cartState));
      } else {
        console.log(data.message);
      }
    });
  });
}

let cartState = {};

function displayShoppingCart() {
  $.get("/pos/getCart", function (cartData) {
    const cartTable = $("#cartTable tbody");
    cartTable.empty();
    let totalItems = 0;
    let totalAmount = 0;
    const cashInput = $("#cash").val();
    const transferInput = $("#moneyTransfer").val();
    let cashValue = 0;
    let transferValue = 0;

    cartData.forEach(function (item, index) {
      if (cartState[item.productName] === undefined) {
        cartState[item.productName] = 1;
      }

      cartTable.append(`
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td><input type="number" value="${
                  cartState[item.productName]
                }" min="1" max="99" class="quantity-input form-control" oninput="updateQuantityInCart($(this).closest('tr'), this.value); calculateCart();" ></td>
                <td hidden>${item.productId}</td>
                <td>${item.productPrice}</td>
                <td><i class=" deleteProductCart fa fa-times" id = "deleteProductCart" aria-hidden="true"></i></td>
            </tr>
        `);

      item.productPrice = item.productPrice.replace(/\./g, "");
      totalAmount +=
        parseFloat(item.productPrice) * cartState[item.productName];
      totalItems += parseInt(cartState[item.productName]);
    });

    if (cashInput !== "" && transferInput === "") {
      cashValue = parseFloat(cashInput.replace(/\./g, ""));
      console.log(cashValue);
      console.log(totalAmount);
      const remainMoney = cashValue - totalAmount;
      console.log(remainMoney);
      let absoluteRemainMoney = Math.abs(remainMoney);
      console.log(absoluteRemainMoney);
      if (isNaN(absoluteRemainMoney)) {
        absoluteRemainMoney = 0;
      }
      if (remainMoney < 0) {
        $("#remainMoneyPositive").hide();
        $("#remainMoneyNegative").show();
      } else {
        $("#remainMoneyPositive").show();
        $("#remainMoneyNegative").hide();
      }
      $("#remainMoney").text(formatCurrency(absoluteRemainMoney));
    } else if (transferInput !== "" && cashInput === "") {
      transferValue = parseFloat(transferInput.replace(/\./g, ""));
      console.log(transferValue);
      console.log(totalAmount);
      const remainMoney = transferValue - totalAmount;
      console.log(remainMoney);
      let absoluteRemainMoney = Math.abs(remainMoney);
      console.log(absoluteRemainMoney);
      if (isNaN(absoluteRemainMoney)) {
        absoluteRemainMoney = 0;
      }
      if (remainMoney < 0) {
        $("#remainMoneyPositive").hide();
        $("#remainMoneyNegative").show();
      } else {
        $("#remainMoneyPositive").show();
        $("#remainMoneyNegative").hide();
      }
      $("#remainMoney").text(formatCurrency(absoluteRemainMoney));
    } else {
      $("#remainMoney").text(formatCurrency(totalAmount));
    }

    totalAmount = formatCurrency(totalAmount);
    $("#total").text(totalItems);
    $("#amount").text(totalAmount);
    sessionStorage.setItem("cartData", JSON.stringify(cartData));
  });
}

function clearCart() {
  const cartTable = $("#cartTable tbody");
  const totalItems = $("#total");
  const amount = $("#amount");
  const discount = $("#inputDiscount").val("0");
  const paymentMethod = $("#payment_method").val("");
  const remainMoney = $("#remainMoney").empty();
  const cash = $("#cash").val("");
  const moneyTransfer = $("#moneyTransfer").val("");
  amount.empty();
  totalItems.empty();
  cartTable.empty();
  $.post("/pos/clearCart", function (data) {
    console.log(data.message);
  });
}

function findProductInCart(productName) {
  const cartTable = $("#cartTable tbody");
  const rows = cartTable.find("tr");
  let existingItem = null;

  rows.each(function () {
    const rowProductName = $(this).find("td:eq(1)").text();
    if (rowProductName === productName) {
      existingItem = $(this);
      return false;
    }
  });

  return existingItem;
}

$(document).ready(function () {
  const cartData = JSON.parse(sessionStorage.getItem("cartData"));

  if (cartData && cartData.length > 0) {
    displayShoppingCart();
    setupDeleteProductListener();
  } else {
    clearCart();
  }

  window.addEventListener("beforeunload", function () {
    sessionStorage.removeItem("cartData");
  });
});

// $(document).on("click", ".btn-add-card", function () {
//   const productName = $(this).closest(".media").find("h6").text();
//   const productPrice = $(this).closest(".media").find("p").text();
//   const existingItem = findProductInCart(productName);
//   const productId = $(this).closest(".media").find("h7").text();
//   if (existingItem) {
//     const newQuantity =
//       parseInt(existingItem.find(".quantity-input").val()) + 1;
//     updateQuantityInCart(existingItem, newQuantity);
//   } else {
//     if (cartState[productName] === undefined) {
//       cartState[productName] = 1;
//     }
//   }
// });

function calculateCart() {
  const inputDiscount = $("#inputDiscount").val();
  const cartTable = $("#cartTable tbody");
  const rows = cartTable.find("tr");
  let totalAmount = 0;
  const cashValue = parseFloat($("#cash").val().replace(/\./g, ""));
  const transferValue = parseFloat(
    $("#moneyTransfer").val().replace(/\./g, "")
  );
  const cashInput = $("#cash").val();
  const transferInput = $("#moneyTransfer").val();

  rows.each(function () {
    const input = $(this).find(".quantity-input");
    const quantity = parseInt(input.val());
    const price = parseFloat(
      $(this).find("td:nth-child(5)").text().replace(/\./g, "")
    );
    totalAmount += quantity * price;
  });
  // Apply discount as a percentage
  if (!isNaN(inputDiscount) && inputDiscount !== "") {
    const discountPercentage = parseFloat(inputDiscount);
    const discountAmount = (discountPercentage / 100) * totalAmount;
    totalAmount -= discountAmount;
  }
  let remainMoney = 0;
  let absoluteRemainMoney = 0;

  if (cashInput !== "" && !isNaN(cashValue) && transferInput === "") {
    remainMoney = cashValue - totalAmount;
  } else if (
    transferInput !== "" &&
    !isNaN(transferValue) &&
    cashInput === ""
  ) {
    remainMoney = transferValue - totalAmount;
  }
  absoluteRemainMoney = Math.abs(remainMoney);

  if (isNaN(absoluteRemainMoney)) {
    absoluteRemainMoney = 0;
  }

  if (remainMoney < 0) {
    $("#remainMoneyPositive").hide();
    $("#remainMoneyNegative").show();
  } else {
    $("#remainMoneyPositive").show();
    $("#remainMoneyNegative").hide();
  }

  $("#remainMoney").text(formatCurrency(absoluteRemainMoney));

  totalAmount = formatCurrency(totalAmount);
  const totalItems = calculateTotalItems();
  if (cashInput === "" && transferInput === "") {
    $("#remainMoney").text(formatCurrency(totalAmount));
  }
  $("#amount").text(totalAmount);
  $("#total").text(totalItems);
}

function updateQuantityInCart(existingItem, newQuantity) {
  const input = existingItem.find(".quantity-input");
  input.val(newQuantity);
  const productName = existingItem.find("td:nth-child(2)").text();
  cartState[productName] = newQuantity;
  calculateCart();
}

function calculateTotalItems() {
  let totalItems = 0;
  $(".quantity-input").each(function () {
    totalItems += parseInt($(this).val());
  });
  return totalItems;
}

function formatCurrency(number) {
  return number.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function sendData(e) {
  const searchResult = document.getElementById("searchResult");
  let value = e.value.trim();

  if (value.length === 1) {
    searchResult.classList.remove("show");
    return;
  }

  let match = value.match(/^0[0-9]*$/);

  if (match) {
    fetch("/pos/getCus", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ payload: value }),
    })
      .then((res) => res.json())
      .then((data) => {
        let payload = data.payload;
        searchResult.innerHTML = "";

        if (payload.length < 1) {
          const resultItem = document.createElement("a");
          resultItem.classList.add("dropdown-item");
          resultItem.textContent = "Không tìm thấy người dùng";
          resultItem.addEventListener("click", function () {
            $("#customerName").val("");
            $("#customerAddress").val("");
            $("#customerGender").val("");
            searchResult.classList.remove("show");
          });
          searchResult.appendChild(resultItem);
          searchResult.classList.add("show");
          $("#searchResult").show();
          setTimeout(function () {
            searchResult.classList.remove("show");
            $("#searchResult").hide();
          }, 6000);
          return;
        }
        payload.forEach((item) => {
          const resultItem = document.createElement("a");
          resultItem.classList.add("dropdown-item");
          resultItem.textContent = item.name + " (" + item.phone + ")";
          resultItem.addEventListener("click", function () {
            $("#customerMobile").val(item.phone);
            $("#customerName").val(item.name);
            $("#customerAddress").val(item.address);
            $("#customerGender").val(item.gender);
            $("#customerId").val(item._id);
            searchResult.classList.remove("show");
          });
          searchResult.appendChild(resultItem);
        });

        searchResult.classList.add("show");
        $("#searchResult").show();
      });
  }

  if (value === "") {
    searchResult.classList.remove("show");
    return;
  }
}

function sendDataProduct(e) {
  const searchResult = document.getElementById("searchResultProduct");

  fetch("/pos/getProduct", {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ payload: e.value }),
  })
    .then((res) => res.json())
    .then((data) => {
      let payload = data.payload;
      console.log(payload);
      searchResult.innerHTML = "";
      if (payload.length < 1) {
        searchResult.innerHTML = "<p>Not found</p>";
        return;
      }

      // Create hr and row d-flex outside the loop
      let rowElement = document.createElement("div");
      rowElement.className = "row d-flex";
      rowElement.style = "overflow-x:auto; height:370px;";
      searchResult.appendChild(rowElement);

      payload.forEach((item, index) => {
        console.log(item);
        let card = document.createElement("div");
        card.className = "col-xl-4 col-md-6 col-sm-12 m-b-20 p-2";
        card.innerHTML = `
                    <div class="mb-2 w-50">
                        <div class="media">
                            <img class="align-self-center" alt="your image" width="70px" height="130px" src="/uploads/${item.image}">
                            <div class="media-body ml-3">
                                <h6 class="mb-2">${item.name}</h6>
                                <h4 style="color: firebrick;">${item.barcodeUPC}</h4>
                                <h7 hidden class="mb-2">${item._id}</h7>
                                <button class="btn btn-add-card btn-round btn-primary-rgba" data-product-id="${item._id}">
                                    <i class="fa fa-shopping-cart" style="font-size:24px" type="submit" value="submit"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;

        rowElement.appendChild(card);
      });
    });
}

$(document).ready(function () {
  $("#poscat").on("change", function () {
    const selectedCategory = $(this).val();
    $.ajax({
      url: `/pos/search?poscat=${selectedCategory}`,
      method: "POST",
      dataType: "json",
      success: function (data) {
        populateSearchResults(data);
        console.log(data.products);
      },
      error: function (error) {
        console.error(error);
      },
    });
  });
});
function populateSearchResults(data) {
  const searchResult = document.getElementById("searchResultProduct");
  let payload = data.products;

  searchResult.innerHTML = "";

  if (payload.length < 1) {
    searchResult.innerHTML = "<p>Not found</p>";
    return;
  }

  // Create hr and row d-flex outside the loop
  let rowElement = document.createElement("div");
  rowElement.className = "row d-flex";
  rowElement.style = "overflow-x:auto; height:350px;";
  searchResult.appendChild(rowElement);

  payload.forEach((item, index) => {
    console.log(item);
    let card = document.createElement("div");
    card.className = "col-xl-4 col-md-6 col-sm-12 m-b-20 p-2";
    card.innerHTML = `
            <div class="mb-2 w-50">
                <div class="media">
                    <img class="align-self-center" alt="your image" width="70px" height="130px" src="/uploads/${item.image}">
                    <div class="media-body ml-3">
                        <h6 class="mb-2">${item.name}</h6>
                        <h4 style="color: firebrick;">0${item.barcodeUPC}</h4>
                        <h7 hidden class="mb-2">${item._id}</h7>
                        <button class="btn btn-add-card btn-round btn-primary-rgba" data-product-id="${item._id}">
                            <i class="fa fa-shopping-cart" style="font-size:24px" type="submit" value="submit"></i>
                        </button>
                    </div>
                </div>
            </div>`;

    rowElement.appendChild(card);
  });
}

function checkFullData() {
  const nameCustomer = $("#customerName").val();
  const id = $("#customerId").val();
  const moneyTransferValue = parseFloat(
    $("#moneyTransfer").val().replace(/\./g, "")
  );
  if (nameCustomer === "" || id === "" || moneyTransferValue === "") {
    return false;
  }
  return true;
}
$("#payButton").click(function () {
  $("#invoicemodal").css("display", "none");
  const id = $("#customerId").val();
  const nameCustomer = $("#customerName").val();
  const nameStaff = $("#staffName").text();
    if (checkFullData() == true) {
      const totalAmount = parseFloat($("#amount").text().replace(/\./g, ""));
      const cashValue = parseFloat($("#cash").val().replace(/\./g, ""));
      const discount = parseInt($("#inputDiscount").val());
      console.log(discount);
      const moneyTransferValue = parseFloat(
        $("#moneyTransfer").val().replace(/\./g, "")
      );
      let amount_given = 0;
      let change_given = parseFloat(
        $("#remainMoney").text().replace(/\./g, "")
      );

      if (isNaN(change_given)) {
        change_given = 0;
      }
      const selectedBank = $("#transferAccountId").val();
      let paymentMethod = "";

      if (!isNaN(cashValue) && cashValue > 0) {
        paymentMethod = "Tiền mặt";
        amount_given = cashValue;
      } else if (
        !isNaN(moneyTransferValue) &&
        moneyTransferValue > 0 &&
        selectedBank
      ) {
        paymentMethod = "Chuyển khoản (" + selectedBank + ")";
        amount_given = moneyTransferValue;
      } else {
        paymentMethod = "Unknown";
      }
      const products = [];
      const cartTable = $("#cartTable tbody tr");

      cartTable.each(function () {
        const productName = $(this).find("td:nth-child(2)").text().split(" - ");
        var qty = parseInt($(this).find('input[type="number"]').val());
        const productId = $(this).find("td:nth-child(5)").text();
        console.log(productId);
        const unitPrice = parseFloat($(this).find('td').eq(3).text().replace(/\D/g, ''))
        const totalPrice = qty * unitPrice;

        products.push({
          product_name: productName[0],
          product_id: productId,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          capacity: productName[1],
          color: productName[2],
        });

        console.log(products);
      });
      // Checkout the order
      $.ajax({
        url: "/order/checkout/" + id,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          customer_id: id,
          customerName: nameCustomer,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          amount_given: amount_given,
          change_given: change_given,
          discount: discount,
          products: products,
          nameStaff: nameStaff,
        }),
        success: function (response) {
          if (response.success) {
            orderId = response.order._id;
            $(".modal-backdrop.show").css("opacity", "0.5");
            $("#invoicemodal").css("display", "block");
          } else {
            $("#invoicemodal").css("display", "none");
            $("#msg6").css("display", "block");
            setTimeout(function () {
              $("#msg6").css("display", "none");
            }, 3000);
            console.error(response.error);
          }

          // Get and display the order details
          $.ajax({
            url: "/order/getOrder/" + orderId,
            method: "GET",
            success: function (data) {
              console.log(data);
              $("#pri_invo a").attr(
                "href",
                `/order/download-invoice/${data._id}`
              );
              $("#orderNumber span").text("Order Id: " + data._id);
              $("#orderNameCus span").text(
                "Tên khách hàng: " + data.customer_name
              );
              $("#orderPaymentMethod span").text(
                "Phương thức thanh toán: " + data.payment_method
              );
              $("#orderNameStaff span").text("Nhân viên: " + data.staff_name);
              $("#oldTotalAmountInvoice").text(
                formatCurrency(
                  data.total_amount + (data.total_amount * data.discount) / 100
                )
              );
              $("#discount").text(data.discount + "%");
              const date = new Date(data.created);
              const formattedDate = date.toLocaleString();
              $("#orderDate").text(formattedDate);
              $("#totalAmountInvoice").text(formatCurrency(data.total_amount));
              $("#amount_given").text(formatCurrency(data.amount_given));
              $("#change_given").text(formatCurrency(data.change_given));
              // Clear existing rows in the table
              $("#item").empty();

              // Append each product to the table
              data.products.forEach(function (product, index) {
                const formattedUnitPrice = formatCurrency(product.unit_price);
                const formattedTotalPrice = formatCurrency(product.total_price);
                const row = `
            <tr>
              <td>${index + 1}</td>
              <td>
                <h6>${product.product_name}</h6>
              </td>
              <td>${product.quantity}</td>
              <td>${formattedUnitPrice}</td>
              <td>${formattedTotalPrice}</td>
            </tr>
          `;
                $("#item").append(row);
              });
              console.log("data:", data);
              $("#exampleModal").on("hide.bs.modal", function () {
                location.reload();
              });
            },
            error: function (error) {
              console.error("Error:", error);
            },
          });
        },
        error: function (error) {
          console.error("Error:", error);
        },
      });
    } else {
      $("#invoicemodal").css("display", "none");
      $("#msg").css("display", "block");
      setTimeout(function () {
        $("#msg").css("display", "none");
      }, 3000);
    }
  
});
