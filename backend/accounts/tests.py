from rest_framework import status
from rest_framework.test import APITestCase

REGISTER = "/api/auth/register/"
LOGIN = "/api/auth/login/"
ME = "/api/auth/me/"

CREDENTIALS = {"username": "indy", "email": "indy@museum.org", "password": "it-belongs-in-a-museum-1936"}


class AuthTests(APITestCase):
    def test_register_returns_token(self):
        response = self.client.post(REGISTER, CREDENTIALS)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["username"], "indy")

    def test_login_returns_same_token(self):
        register = self.client.post(REGISTER, CREDENTIALS)
        login = self.client.post(
            LOGIN, {"username": "indy", "password": CREDENTIALS["password"]}
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertEqual(login.data["token"], register.data["token"])

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            REGISTER, {**CREDENTIALS, "password": "123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(ME).status_code, status.HTTP_401_UNAUTHORIZED)
        token = self.client.post(REGISTER, CREDENTIALS).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        response = self.client.get(ME)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "indy")
