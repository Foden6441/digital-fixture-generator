package main

import "golang.org/x/crypto/bcrypt"

func checkPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
