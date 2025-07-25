package com.ektai.evlicense.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.Observer
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.ektai.evlicense.R
import com.ektai.evlicense.data.LicenseEntity
import com.ektai.evlicense.viewmodel.LicenseViewModel
import kotlinx.coroutines.launch

class LicenseListFragment : Fragment() {
    private val viewModel: LicenseViewModel by activityViewModels()
    private lateinit var adapter: LicenseListAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_license_list, container, false)
        val recyclerView = view.findViewById<RecyclerView>(R.id.recyclerViewLicenses)
        val searchEdit = view.findViewById<EditText>(R.id.editTextSearch)
        val searchBtn = view.findViewById<Button>(R.id.buttonSearch)
        val addBtn = view.findViewById<Button>(R.id.buttonAddLicense)

        adapter = LicenseListAdapter(emptyList(),
            onDetail = { license ->
                (activity as? MainActivity)?.showLicenseDetail(license)
            },
            onEdit = { license ->
                (activity as? MainActivity)?.showLicenseEdit(license)
            }
        )
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.lifecycle.repeatOnLifecycle(androidx.lifecycle.Lifecycle.State.STARTED) {
                viewModel.allLicenses.collect {
                    adapter.updateData(it)
                }
                viewModel.searchResults.collect {
                    adapter.updateData(it)
                }
            }
        }
        viewModel.loadAllLicenses()

        searchBtn.setOnClickListener {
            val query = searchEdit.text.toString()
            viewModel.searchLicenses(query)
        }
        addBtn.setOnClickListener {
            (activity as? MainActivity)?.showLicenseEdit(null)
        }
        return view
    }
} 