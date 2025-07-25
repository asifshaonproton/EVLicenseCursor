package com.ektai.evlicense.ui

import android.content.Context
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.ektai.evlicense.R
import com.ektai.evlicense.data.LicenseEntity
import com.ektai.evlicense.util.CryptoUtils
import com.ektai.evlicense.util.NfcUtils
import com.ektai.evlicense.viewmodel.LicenseViewModel
import org.json.JSONObject

class LicenseEditFragment : Fragment() {
    private val viewModel: LicenseViewModel by activityViewModels()
    private var editingLicense: LicenseEntity? = null
    private var nfcAdapter: NfcAdapter? = null

    override fun onAttach(context: Context) {
        super.onAttach(context)
        nfcAdapter = NfcAdapter.getDefaultAdapter(context)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        editingLicense = arguments?.getParcelable("license", com.ektai.evlicense.data.LicenseEntity::class.java)
    }
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_license_edit, container, false)
        val holderNameEdit = view.findViewById<EditText>(R.id.editTextHolderName)
        val mobileEdit = view.findViewById<EditText>(R.id.editTextMobile)
        val citySpinner = view.findViewById<Spinner>(R.id.spinnerCity)
        val typeSpinner = view.findViewById<Spinner>(R.id.spinnerLicenseType)
        val numberEdit = view.findViewById<EditText>(R.id.editTextLicenseNumber)
        val nfcEdit = view.findViewById<EditText>(R.id.editTextNfcCardNumber)
        val validityEdit = view.findViewById<EditText>(R.id.editTextValidityDate)
        val saveBtn = view.findViewById<Button>(R.id.buttonSaveLicense)

        // Setup city dropdown
        val cityOptions = listOf("Rangpur", "Narayanganj")
        citySpinner.adapter = android.widget.ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, cityOptions)

        // Setup license type dropdown
        val typeOptions = listOf("Auto (A)", "Rickshaw (R)", "Van (V)", "Mishuk (M)", "Pushcart/Privet (P)")
        typeSpinner.adapter = android.widget.ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, typeOptions)

        // Setup date picker for validity date
        validityEdit.setOnClickListener {
            val cal = java.util.Calendar.getInstance()
            val datePicker = android.app.DatePickerDialog(requireContext(), { _, y, m, d ->
                val dateStr = "%04d-%02d-%02d".format(y, m + 1, d)
                validityEdit.setText(dateStr)
            }, cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH), cal.get(java.util.Calendar.DAY_OF_MONTH))
            datePicker.show()
        }

        // Restore values if editing
        editingLicense?.let {
            holderNameEdit.setText(it.holderName)
            mobileEdit.setText(it.mobile)
            citySpinner.setSelection(cityOptions.indexOf(it.city).takeIf { idx -> idx >= 0 } ?: 0)
            typeSpinner.setSelection(typeOptions.indexOfFirst { opt -> opt.startsWith(it.licenseType) || opt.contains(it.licenseType) }.takeIf { idx -> idx >= 0 } ?: 0)
            numberEdit.setText(it.licenseNumber)
            nfcEdit.setText(it.nfcCardNumber)
            validityEdit.setText(it.validityDate)
        }

        saveBtn.setOnClickListener {
            val license = LicenseEntity(
                id = editingLicense?.id ?: 0,
                holderName = holderNameEdit.text.toString(),
                mobile = mobileEdit.text.toString(),
                city = cityOptions[citySpinner.selectedItemPosition],
                licenseType = typeOptions[typeSpinner.selectedItemPosition].substringBefore(" ").trim(),
                licenseNumber = numberEdit.text.toString(),
                nfcCardNumber = nfcEdit.text.toString(),
                validityDate = validityEdit.text.toString()
            )
            if (editingLicense == null) {
                viewModel.insertLicense(license)
            } else {
                viewModel.updateLicense(license)
            }
            requireActivity().onBackPressedDispatcher.onBackPressed()
        }

        // Add NFC write button as before
        val nfcWriteBtn = Button(requireContext()).apply {
            text = getString(R.string.nfc_write)
            setOnClickListener {
                try {
                    val licenseJson = JSONObject()
                    licenseJson.put("holderName", holderNameEdit.text.toString())
                    licenseJson.put("mobile", mobileEdit.text.toString())
                    licenseJson.put("city", citySpinner.selectedItem.toString())
                    licenseJson.put("licenseType", typeSpinner.selectedItem.toString())
                    licenseJson.put("licenseNumber", numberEdit.text.toString())
                    licenseJson.put("nfcCardNumber", nfcEdit.text.toString())
                    licenseJson.put("validityDate", validityEdit.text.toString())

                    val licenseData = licenseJson.toString()
                    val key = "YourSuperLongSecretKeyForNFCEncryption2024!@#"
                    val encryptedData = CryptoUtils.encrypt(licenseData, key)
                    (activity as? MainActivity)?.pendingWriteData = encryptedData

                    Toast.makeText(requireContext(), "Ready to write to NFC tag. Tap a tag now.", Toast.LENGTH_SHORT).show()
                    (activity as? MainActivity)?.enableNfcForegroundDispatch()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Error creating JSON: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
        view.findViewById<ViewGroup>(R.id.editLicenseContent).addView(nfcWriteBtn)
        return view
    }
    fun onNfcTagDiscovered(tag: Tag) {
        // Read card number from NDEF message
        val cardNumber = NfcUtils.readNdefMessage(tag) ?: ""
        // Get NFC tag string (UID)
        val tagString = tag.id.joinToString("") { "%02X".format(it) }

        // Set values to UI fields
        view?.findViewById<EditText>(R.id.editTextNfcCardNumber)?.setText(cardNumber)
        view?.findViewById<EditText>(R.id.editTextLicenseNumber)?.setText(tagString)

        // Automatically navigate to LicenseDetailFragment
        val license = com.ektai.evlicense.data.LicenseEntity(
            id = 0,
            holderName = view?.findViewById<EditText>(R.id.editTextHolderName)?.text?.toString() ?: "",
            mobile = view?.findViewById<EditText>(R.id.editTextMobile)?.text?.toString() ?: "",
            city = view?.findViewById<Spinner>(R.id.spinnerCity)?.selectedItem?.toString() ?: "",
            licenseType = view?.findViewById<Spinner>(R.id.spinnerLicenseType)?.selectedItem?.toString() ?: "",
            licenseNumber = tagString,
            nfcCardNumber = cardNumber,
            validityDate = view?.findViewById<EditText>(R.id.editTextValidityDate)?.text?.toString() ?: ""
        )
        (activity as? MainActivity)?.showLicenseDetail(license)
    }
} 