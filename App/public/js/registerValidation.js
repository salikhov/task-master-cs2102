function validateSubmit(formData) {
  validateSubmit(formData, false);
}

function validateSubmit(formData, disableAccountTypeValidate) {
  const pass = validatePasswords(formData);
  if (disableAccountTypeValidate) {
    return pass;
  } else {
    const accType = validateAccountType(formData);
    return pass && accType;
  }
}

function validateAccountType(formData) {
  const result = formData.userCheck.checked || formData.workerCheck.checked;
  if (result) {
    formData.userCheck.classList.remove("is-invalid");
    formData.workerCheck.classList.remove("is-invalid");
    formData.userCheck.classList.add("is-valid");
    formData.workerCheck.classList.add("is-valid");
  } else {
    formData.userCheck.classList.remove("is-valid");
    formData.workerCheck.classList.remove("is-valid");
    formData.userCheck.classList.add("is-invalid");
    formData.workerCheck.classList.add("is-invalid");
  }
  return result;
}

function validatePasswords(formData) {
  const result = formData.password.value === formData.confirm.value;
  if (result) {
    formData.password.classList.remove("is-invalid");
    formData.confirm.classList.remove("is-invalid");
    formData.password.classList.add("is-valid");
    formData.confirm.classList.add("is-valid");
  } else {
    formData.password.classList.remove("is-valid");
    formData.confirm.classList.remove("is-valid");
    formData.password.classList.add("is-invalid");
    formData.confirm.classList.add("is-invalid");
  }
  return result;
}
