package com.ektai.evlicense.util

import java.security.MessageDigest
import android.util.Base64

object CryptoUtils {
    private fun sha256(key: String): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(key.toByteArray(Charsets.UTF_8))
    }

    fun encrypt(plainText: String, key: String): String {
        val keyBytes = sha256(key)
        val plainBytes = plainText.toByteArray(Charsets.UTF_8)
        val cipherBytes = ByteArray(plainBytes.size)
        for (i in plainBytes.indices) {
            cipherBytes[i] = (plainBytes[i].toInt() xor keyBytes[i % keyBytes.size].toInt()).toByte()
        }
        return Base64.encodeToString(cipherBytes, Base64.NO_WRAP)
    }

    fun decrypt(cipherText: String, key: String): String {
        val keyBytes = sha256(key)
        val cipherBytes = Base64.decode(cipherText, Base64.NO_WRAP)
        val plainBytes = ByteArray(cipherBytes.size)
        for (i in cipherBytes.indices) {
            plainBytes[i] = (cipherBytes[i].toInt() xor keyBytes[i % keyBytes.size].toInt()).toByte()
        }
        return String(plainBytes, Charsets.UTF_8)
    }
} 