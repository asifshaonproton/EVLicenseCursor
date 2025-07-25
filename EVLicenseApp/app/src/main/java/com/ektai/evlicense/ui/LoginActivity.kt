package com.ektai.evlicense.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ektai.evlicense.R
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private val validEmail = "user@ev.com"
    private val validPassword = "password123"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val emailEdit = findViewById<EditText>(R.id.editTextEmail)
        val passwordEdit = findViewById<EditText>(R.id.editTextPassword)
        val loginBtn = findViewById<Button>(R.id.buttonLogin)

        loginBtn.setOnClickListener {
            val email = emailEdit.text.toString().trim()
            val password = passwordEdit.text.toString()
            if (email == validEmail && password == validPassword) {
                // Save session (for demo, just show toast)
                lifecycleScope.launch {
                    Toast.makeText(this@LoginActivity, getString(R.string.success_login), Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                }
            } else {
                Toast.makeText(this, getString(R.string.error_invalid_credentials), Toast.LENGTH_SHORT).show()
            }
        }
    }
} 