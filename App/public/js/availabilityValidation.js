function validateSubmit(formData) {
  const startTime = moment(formData.startTime.value, "ddd, MMM D, YYYY h:mm A");
  const endTime = moment(formData.endTime.value, "ddd, MMM D, YYYY h:mm A");
  const endAfterStart = validateEndAfterStart(formData, startTime, endTime);
  return endAfterStart;
}

function validateEndAfterStart(formData, start, end) {
  const result = end.isAfter(start) && start.isAfter(curr) && end.isAfter(curr);
  if (result) {
    formData.startTime.classList.remove("is-invalid");
    formData.endTime.classList.remove("is-invalid");
    formData.startTime.classList.add("is-valid");
    formData.endTime.classList.add("is-valid");
  } else {
    formData.startTime.classList.remove("is-valid");
    formData.endTime.classList.remove("is-valid");
    formData.startTime.classList.add("is-invalid");
    formData.endTime.classList.add("is-invalid");
  }
  return result;
}
