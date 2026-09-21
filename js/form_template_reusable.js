document.addEventListener('DOMContentLoaded', function () {
    const defaultConfig = {
        formId: 'form',
        formSelector: null,
        submitBtnId: 'btnSubmit',
        submitTextId: 'btnSubmitText',
        submitIconId: 'btnSubmitIcon',
        resetBtnId: 'btnReset',
        idFieldId: null,
        actionFieldId: 'action',
        updateBannerId: null,
        currentIdDisplayId: null,
        errorAlertId: null,
        errorListId: null,
        successModalId: null,
        modalResetBtnId: null,
        successTitleId: null,
        successTextId: null,
        detailsId: null,
        focusFieldId: null,
        fetchUrl: '',
        modeLabels: {
            insert: {
                text: 'บันทึกข้อมูล',
                icon: 'bi bi-cloud-arrow-up-fill me-2',
                successTitle: 'บันทึกข้อมูลสำเร็จ!'
            },
            update: {
                text: 'อัปเดตข้อมูล',
                icon: 'bi bi-pencil-square me-2',
                successTitle: 'อัปเดตข้อมูลสำเร็จ!'
            }
        },
        renderSuccessDetails: function (result) {
            const id = result && (result.id || result.ID || result.ProductID || result.inserted_id || result.userId || result.recordId)
                ? (result.id || result.ID || result.ProductID || result.inserted_id || result.userId || result.recordId)
                : '-';
            const focusValue = document.getElementById(this.focusFieldId || '')?.value || '';

            return `
                <div class="mb-1"><strong>ID:</strong> <span class="badge bg-primary fs-6">#${id}</span></div>
                <div class="mb-1"><strong>ข้อมูล:</strong> ${focusValue}</div>
            `;
        }.bind({ focusFieldId: null }),
        onSuccess: function () {},
        onError: function () {}
    };

    const config = Object.assign({}, defaultConfig, window.formTemplateConfig || {});

    if (config.formSelector) {
        config.formId = null;
    }

    const getElement = (id) => (id ? document.getElementById(id) : null);
    const form = config.formSelector ? document.querySelector(config.formSelector) : getElement(config.formId);

    if (!form) {
        return;
    }

    const btnSubmit = getElement(config.submitBtnId);
    const btnSubmitText = getElement(config.submitTextId);
    const btnSubmitIcon = getElement(config.submitIconId);
    const btnReset = getElement(config.resetBtnId);
    const idInput = getElement(config.idFieldId);
    const actionInput = getElement(config.actionFieldId);
    const updateBanner = getElement(config.updateBannerId);
    const currentIdDisplay = getElement(config.currentIdDisplayId);
    const serverErrorAlert = getElement(config.errorAlertId);
    const serverErrorList = getElement(config.errorListId);
    const successModal = config.successModalId ? new bootstrap.Modal(getElement(config.successModalId)) : null;
    const modalResetBtn = getElement(config.modalResetBtnId);
    const successTitle = getElement(config.successTitleId);
    const successText = getElement(config.successTextId);
    const detailsBox = getElement(config.detailsId);
    const focusField = getElement(config.focusFieldId);

    config.renderSuccessDetails = config.renderSuccessDetails || function () { return ''; };
    config.onSuccess = config.onSuccess || function () {};
    config.onError = config.onError || function () {};

    if (config.focusFieldId) {
        config.renderSuccessDetails = function (result) {
            const id = result && (result.id || result.ID || result.ProductID || result.inserted_id || result.userId || result.recordId)
                ? (result.id || result.ID || result.ProductID || result.inserted_id || result.userId || result.recordId)
                : '-';
            const focusValue = document.getElementById(config.focusFieldId)?.value || '';

            return `
                <div class="mb-1"><strong>ID:</strong> <span class="badge bg-primary fs-6">#${id}</span></div>
                <div class="mb-1"><strong>ข้อมูล:</strong> ${focusValue}</div>
            `;
        };
    }

    const state = {
        isUpdateMode: false,
        isSubmitting: false
    };

    function clearServerErrors() {
        if (!serverErrorAlert || !serverErrorList) return;
        serverErrorAlert.classList.add('d-none');
        serverErrorList.innerHTML = '';
    }

    function updateSubmitButton({ loading = false, mode = state.isUpdateMode } = {}) {
        if (!btnSubmit || !btnSubmitIcon || !btnSubmitText) return;

        btnSubmit.disabled = loading;
        btnSubmit.className = mode
            ? 'btn btn-warning px-5 fw-bold text-dark'
            : 'btn btn-success btn-success-custom px-5';

        if (loading) {
            btnSubmitIcon.className = 'spinner-border spinner-border-sm me-2';
            btnSubmitText.textContent = mode
                ? `กำลังส่งข้อมูลอัปเดตไปที่ ${config.fetchUrl || 'server'}...`
                : `กำลังส่งข้อมูลบันทึกไปที่ ${config.fetchUrl || 'server'}...`;
            return;
        }

        const label = mode ? config.modeLabels.update : config.modeLabels.insert;
        btnSubmitIcon.className = label.icon;
        btnSubmitText.textContent = label.text;
    }

    function setCreateMode() {
        state.isUpdateMode = false;
        if (idInput) idInput.value = '';
        if (actionInput) actionInput.value = 'insert';
        if (updateBanner) updateBanner.classList.add('d-none');
        clearServerErrors();
        updateSubmitButton({ loading: false, mode: false });
    }

    function setUpdateMode(id) {
        state.isUpdateMode = true;
        if (idInput) idInput.value = id;
        if (actionInput) actionInput.value = 'update';
        if (currentIdDisplay) currentIdDisplay.textContent = `#${id}`;
        if (updateBanner) updateBanner.classList.remove('d-none');
        clearServerErrors();
        updateSubmitButton({ loading: false, mode: true });
    }

    function resolveRecordId(result) {
        if (!result) return null;
        return result.id || result.ID || result.ProductID || result.inserted_id || result.userId || result.recordId || null;
    }

    function resetFormToCreateMode() {
        form.reset();
        form.classList.remove('was-validated');
        setCreateMode();

        setTimeout(() => {
            if (focusField) focusField.focus();
        }, 100);
    }

    function handleServerValidationErrors(errors) {
        if (!serverErrorAlert || !serverErrorList) return;
        serverErrorAlert.classList.remove('d-none');
        serverErrorList.innerHTML = '';

        Object.keys(errors || {}).forEach((key) => {
            const li = document.createElement('li');
            li.textContent = `${key}: ${errors[key]}`;
            serverErrorList.appendChild(li);
        });
    }

    function handleServerSuccess(result) {
        const mode = state.isUpdateMode ? 'update' : 'insert';
        const label = config.modeLabels[mode];

        if (successTitle) successTitle.textContent = label.successTitle;
        if (successText) successText.textContent = `${mode === 'update' ? 'แก้ไข/อัปเดต' : 'เพิ่ม'}ข้อมูลเรียบร้อยแล้ว`;

        const returnedId = resolveRecordId(result);
        if (returnedId) {
            setUpdateMode(returnedId);
        }

        if (detailsBox && typeof config.renderSuccessDetails === 'function') {
            detailsBox.innerHTML = config.renderSuccessDetails(result);
        }

        config.onSuccess(result);

        if (successModal) successModal.show();
    }

    if (btnReset) {
        btnReset.addEventListener('click', resetFormToCreateMode);
    }

    if (modalResetBtn) {
        modalResetBtn.addEventListener('click', resetFormToCreateMode);
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearServerErrors();

        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        form.classList.add('was-validated');
        state.isSubmitting = true;
        updateSubmitButton({ loading: true, mode: state.isUpdateMode });

        const formData = new FormData(form);

        try {
            const response = await fetch(config.fetchUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json().catch(() => null);

            if (response.ok && result && result.success !== false) {
                handleServerSuccess(result);
                return;
            }

            if (response.status === 422 || (result && result.errors)) {
                handleServerValidationErrors(result.errors || {
                    general: result.message || 'ข้อมูลไม่ผ่านการตรวจสอบจาก Server'
                });
                return;
            }

            throw new Error((result && result.message) || `Server ตอบกลับด้วย HTTP Status: ${response.status}`);
        } catch (error) {
            config.onError(error);
            handleServerValidationErrors({
                'ข้อผิดพลาดในการเชื่อมต่อ': `ไม่สามารถส่งข้อมูลไปยังไฟล์ ${config.fetchUrl || 'server'} ได้ (${error.message}) กรุณาตรวจสอบว่ามีไฟล์นี้บน Web Server แล้ว`
            });
        } finally {
            state.isSubmitting = false;
            updateSubmitButton({ loading: false, mode: state.isUpdateMode });
        }
    });

    setCreateMode();
});
