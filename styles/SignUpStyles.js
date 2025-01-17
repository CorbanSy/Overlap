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
    justifyContent: "flex-end", // Moves content to the bottom
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "transparent", // Transparent background for the form
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
  submitButton: {
    backgroundColor: "#34D399", // Teal for the sign-up button
    paddingVertical: 15,
    borderRadius: 12,
  },
  submitButtonText: {
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
  loginPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  promptText: {
    fontSize: 14,
    color: "#FFFFFF", // White prompt text
  },
  loginLink: {
    fontSize: 14,
    color: "#34D399", // Teal login link
    fontWeight: "bold",
  },
});

export default styles;
