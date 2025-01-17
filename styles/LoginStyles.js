import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1, // Fullscreen background image
  },
  container: {
    flex: 1,
  },
  backButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    padding: 10,
  },
  backButton: {
    backgroundColor: "#34D399", // Teal for back button
    padding: 10,
    borderRadius: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: "flex-end", // Moves all content towards the bottom
    paddingHorizontal: 20, // Adds padding on the left and right
    paddingBottom: 40, // Adds spacing at the bottom
    backgroundColor: "transparent", // Transparent form container
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#FFFFFF", // White label
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    padding: 15,
    backgroundColor: "#FFFFFF", // White background for input
    color: "#4B5563",
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#9CA3AF", // Gray for forgot password text
  },
  loginButton: {
    backgroundColor: "#34D399", // Teal for login button
    paddingVertical: 15,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
    textAlign: "center",
  },
  orText: {
    fontSize: 18,
    color: "#FFFFFF", // White "Or" text
    textAlign: "center",
    marginVertical: 20,
  },
  socialMediaContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  socialButton: {
    padding: 10,
    backgroundColor: "#FFFFFF", // White for social button background
    borderRadius: 12,
  },
  socialIcon: {
    width: 40,
    height: 40,
  },
  signUpPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  promptText: {
    fontSize: 14,
    color: "#FFFFFF", // White prompt text
  },
  signUpLink: {
    fontSize: 14,
    color: "#34D399", // Teal sign-up link
    fontWeight: "bold",
  },
});

export default styles;
