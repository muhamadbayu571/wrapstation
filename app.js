$(function () {
  const { jsPDF } = window.jspdf;
  let partIndex = 0;
  const partsContainer = $("#partsContainer");

  const sigCanvas = document.getElementById("signature");
  const signaturePad = new SignaturePad(sigCanvas, { penColor: "rgb(30,30,30)" });

  function refreshGenerateState() {
    const agreed = $("#agreeTerms").is(":checked");
    const hasSig = !signaturePad.isEmpty();
    const hasCust = $("#custName").val().trim() !== "";
    const hasParts = partsContainer.children().length > 0;
    $("#generatePdf").prop("disabled", !(agreed && hasSig && hasCust && hasParts));
  }

  $("#agreeTerms").on("change", refreshGenerateState);
  $("#custName").on("input", refreshGenerateState);
  $("#insDate").each(function () { if(!$(this).val()) $(this).val(new Date().toISOString().slice(0,10)); });

  $("#clearSig").click(function () {
    signaturePad.clear();
    $("#miniPreview").html("");
    refreshGenerateState();
  });

  function updateMiniPreview() {
    const data = signaturePad.toDataURL();
    if (!signaturePad.isEmpty()) {
      $("#miniPreview").html(`<img src="${data}" style="max-width:100%;height:auto;">`);
    } else {
      $("#miniPreview").html("<div class='text-muted small'>No signature yet</div>");
    }
  }

  sigCanvas.addEventListener("mouseup", function () { updateMiniPreview(); refreshGenerateState(); });
  sigCanvas.addEventListener("touchend", function () { updateMiniPreview(); refreshGenerateState(); });

  $("#addPart").click(function () {
    addPartRow();
  });

  $("#clearAllParts").click(function () {
    partsContainer.html("");
    partIndex = 0;
    refreshGenerateState();
  });

  $("#cancelAll").click(function () {
    if (!confirm("Reset semua input dan foto?")) return;
    $("#custName,#carModel,#plateNumber,#wrapColor").val("");
    $("#insDate").val(new Date().toISOString().slice(0,10));
    partsContainer.html("");
    signaturePad.clear();
    $("#agreeTerms").prop("checked", false);
    $("#miniPreview").html("");
    partIndex = 0;
    refreshGenerateState();
  });

  function nid(prefix) { return prefix + "_" + Math.random().toString(36).slice(2,9); }

  function addPartRow() {
    partIndex++;
    const id = nid("part");
    const collapseId = nid("collapse");
    const partHtml = `
      <div class="accordion-item mb-2" data-part-index="${partIndex}">
        <h2 class="accordion-header" id="heading_${id}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            Part: <input class="form-control form-control-sm ms-2 part-name d-inline-block" style="width:220px" placeholder="e.g. Front Windshield">
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse">
          <div class="accordion-body">
            <div class="mb-2 row g-2 align-items-center">
              <div class="col-md-4">
                <label class="form-label">Kategori</label>
                <select class="form-select part-category">
                  <option value="G">Good (G)</option>
                  <option value="F">Fair (F)</option>
                  <option value="P">Poor (P)</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Tambahkan Foto</label>
                <input type="file" accept="image/*" class="form-control photo-input" multiple>
              </div>
              <div class="col-md-4 d-flex align-items-end">
                <button class="btn btn-sm btn-outline-secondary me-2 btn-add-photo">Add Photo</button>
                <button class="btn btn-sm btn-outline-danger btn-remove-part"><i class="fa fa-trash"></i> Remove Part</button>
              </div>
            </div>

            <div class="row g-2 photo-list"></div>
          </div>
        </div>
      </div>
    `;
    partsContainer.append(partHtml);
    refreshGenerateState();
  }

  partsContainer.on("click", ".btn-remove-part", function () {
    if (!confirm("Hapus part ini?")) return;
    $(this).closest(".accordion-item").remove();
    refreshGenerateState();
  });

  partsContainer.on("change", ".photo-input", function (e) {
    handleFilesForPart($(this), e.target.files);
  });

  partsContainer.on("click", ".btn-add-photo", function () {
    $(this).closest(".accordion-item").find(".photo-input").trigger("click");
  });

  // Remove single photo
  partsContainer.on("click", ".remove-photo", function () {
    if (!confirm("Hapus foto ini?")) return;
    $(this).closest(".col-md-4").remove();
    refreshGenerateState();
  });

  function handleFilesForPart($input, files) {
    const $photoList = $input.closest(".accordion-item").find(".photo-list");
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const reader = new FileReader();
      reader.onload = function (ev) {
        const thumbId = nid("photo");
        const html = `
          <div class="col-md-4">
            <div class="photo-item">
              <button class="btn btn-sm btn-danger remove-photo" title="Remove photo" style="z-index:5;position:absolute;right:8px;top:8px;"><i class="fa fa-times"></i></button>
              <img src="${ev.target.result}" class="preview-thumb mb-2" data-src="${ev.target.result}">
              <div class="mb-2">
                <label class="form-label small">Note</label>
                <textarea class="form-control photo-note" placeholder="Add note about this photo"></textarea>
              </div>
            </div>
          </div>
        `;
        $photoList.append(html);
        refreshGenerateState();
      };
      reader.readAsDataURL(f);
    }
    $input.val("");
  }

  $("#generatePdf").click(async function () {
    // final checks
    if (!$("#agreeTerms").is(":checked")) { alert("Tandai syarat & ketentuan dulu."); return; }
    if (signaturePad.isEmpty()) { alert("Tolong berikan signature terlebih dahulu."); return; }

    // Build report DOM
    const report = $("#reportBuilder");
    report.empty();
    report.show();

    // Header
    const logoData = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
          <rect width='100%' height='100%' rx='12' fill='#b71c1c'/>
          <text x='50%' y='55%' font-size='28' font-family='Arial' fill='white' text-anchor='middle'>WS</text>
        </svg>`;
    const headerHtml = `
      <div style="display:flex;align-items:center;margin-bottom:12px">
        <div><img src="data:image/svg+xml;utf8,${encodeURIComponent(logoData)}" width="80" /></div>
        <div style="margin-left:12px">
          <div style="font-weight:700;font-size:18px">WRAP STATION GLOBAL SENTOSA</div>
          <div style="font-size:12px;color:#555">Automotive Wrap & Inspection Division</div>
        </div>
        <div style="margin-left:auto;text-align:right;font-size:12px;color:#333">
          <div>Date: ${$("#insDate").val() || new Date().toISOString().slice(0,10)}</div>
          <div>Report ID: ${"RPT-" + Math.random().toString(36).slice(2,8).toUpperCase()}</div>
        </div>
      </div>
      <hr />
      `;
    report.append(headerHtml);

    // Customer info
    const custHtml = `
      <div style="margin-bottom:10px;">
        <div><strong>Customer:</strong> ${escapeHtml($("#custName").val())}</div>
        <div><strong>Car Model:</strong> ${escapeHtml($("#carModel").val() || "-")}</div>
        <div><strong>Plate Number:</strong> ${escapeHtml($("#plateNumber").val() || "-")}</div>
        <div><strong>Wrap Color:</strong> ${escapeHtml($("#wrapColor").val() || "-")}</div>
      </div>
    `;
    report.append(custHtml);

    // Parts
    report.append(`<div style="margin-top:8px"><strong>Inspection Details:</strong></div>`);
    const parts = [];
    partsContainer.find(".accordion-item").each(function () {
      const $item = $(this);
      const partName = $item.find(".part-name").val() || "Unnamed Part";
      const category = $item.find(".part-category").val();
      const photos = [];
      $item.find(".preview-thumb").each(function () {
        const src = $(this).attr("data-src");
        const note = $(this).closest(".photo-item").find(".photo-note").val() || "";
        photos.push({ src, note });
      });
      parts.push({ partName, category, photos });
    });

    parts.forEach(p => {
      const partBlock = $(`<div style="margin-top:12px;margin-bottom:6px;"><div style="font-weight:600">${escapeHtml(p.partName)} <span style="font-weight:400;color:#666">[${p.category}]</span></div></div>`);
      report.append(partBlock);
      if (p.photos.length === 0) {
        report.append(`<div style="color:#777;margin-bottom:8px">No photos provided.</div>`);
      } else {
        const grid = $('<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>');
        p.photos.forEach(ph => {
          const item = $(`
            <div style="width:48%;border:1px solid #eee;padding:6px;border-radius:6px;background:#fff">
              <img src="${ph.src}" style="width:100%;height:140px;object-fit:cover;border-radius:4px;margin-bottom:6px"/>
              <div style="font-size:12px;color:#333">${escapeHtml(ph.note || "-")}</div>
            </div>
          `);
          grid.append(item);
        });
        report.append(grid);
      }
    });

    const sigData = signaturePad.toDataURL();
    const sigBlock = `
      <div style="margin-top:16px;display:flex;align-items:center;gap:12px">
        <div style="width:60%"><strong>Customer Signature:</strong><div style="margin-top:6px"><img src="${sigData}" style="max-width:100%;height:120px;object-fit:contain;border:1px solid #ddd"/></div></div>
        <div style="font-size:12px;color:#555">By signing, customer acknowledges initial condition of vehicle parts and agrees to proceed with wrap/service as recorded above.</div>
      </div>
    `;
    report.append(sigBlock);

    report.append(`<hr style="margin-top:18px" /><div style="font-size:11px;color:#666;margin-top:6px">Wrap Station Global Sentosa — Demo Report. Generated ${new Date().toLocaleString()}</div>`);

    await new Promise(r => setTimeout(r, 100)); // let DOM paint
    const canvas = await html2canvas(report[0], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = { width: canvas.width, height: canvas.height };
    const pxToPt = pageWidth / imgProps.width;
    const imgHeightPt = imgProps.height * pxToPt;

    if (imgHeightPt <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, imgHeightPt);
    } else {
      let position = 0;
      let remainingHeight = imgProps.height;
      const sliceHeightPx = Math.floor(pageHeight / pxToPt);

      while (remainingHeight > 0) {
        const canvasSlice = document.createElement("canvas");
        canvasSlice.width = imgProps.width;
        canvasSlice.height = Math.min(sliceHeightPx, remainingHeight);

        const ctx = canvasSlice.getContext("2d");
        ctx.drawImage(canvas, 0, position, imgProps.width, canvasSlice.height, 0, 0, imgProps.width, canvasSlice.height);
        const imgSlice = canvasSlice.toDataURL("image/jpeg", 0.95);
        const imgSliceHeightPt = canvasSlice.height * pxToPt;

        if (position !== 0) pdf.addPage();
        pdf.addImage(imgSlice, "JPEG", 0, 0, pageWidth, imgSliceHeightPt);

        position += canvasSlice.height;
        remainingHeight -= canvasSlice.height;
      }
    }

    pdf.save(`inspection_${$("#custName").val().trim().replace(/\s+/g,"_") || "report"}.pdf`);

    report.hide();
  });

  function escapeHtml(unsafe) {
    if (!unsafe && unsafe !== 0) return "";
    return String(unsafe).replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
      })[s];
    });
  }

  setInterval(refreshGenerateState, 700);

  addPartRow();
});
