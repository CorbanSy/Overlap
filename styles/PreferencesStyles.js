import { StyleSheet, Dimensions } from "react-native";
import { themeColors } from "../theme";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg, // Dark green background
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: themeColors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    color: themeColors.bg,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white, // White text for the header
    textAlign: "center",
    marginTop: 20,
  },
  rankContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  rankBoxContainer: {
    alignItems: "center",
  },
  rankBox: {
    width: width / 6,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: themeColors.primary, // Teal background
    borderColor: themeColors.primary, // Match border color with teal
  },
  rankBoxText: {
    fontWeight: "bold",
    fontSize: 14,
    color: themeColors.white, // White text for rank boxes
  },
  rankLabel: {
    color: themeColors.white,
    marginTop: 5,
    fontSize: 12,
  },
  bubblesContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: themeColors.primary, // Teal background for bubbles
  },
  bubbleText: {
    color: themeColors.white, // White text for bubbles
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: themeColors.primary, // Teal background for submit button
    padding: 15,
    borderRadius: 8,
    width: width / 3,
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "center",
  },
  submitButtonText: {
    color: themeColors.white, // White text for submit button
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default styles;
