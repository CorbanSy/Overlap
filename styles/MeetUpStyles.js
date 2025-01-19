import { StyleSheet, Dimensions } from "react-native";
import { themeColors } from "../theme";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white,
    textAlign: "center",
    marginBottom: 20,
  },
  createMeetupSection: {
    flex: 1,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 10,
    backgroundColor: themeColors.secondary,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: themeColors.white,
    marginBottom: 10,
  },
  input: {
    padding: 10,
    backgroundColor: themeColors.white,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 14,
    color: themeColors.bg,
  },
  dropdownLabel: {
    fontSize: 14,
    color: themeColors.white,
    marginBottom: 5,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: themeColors.white,
    borderRadius: 8,
  },
  dropdownBox: {
    backgroundColor: themeColors.white,
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: themeColors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  createButtonText: {
    color: themeColors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  joinMeetupSection: {
    flex: 1,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 10,
    backgroundColor: themeColors.secondary,
  },
  meetupList: {
    marginTop: 10,
  },
  meetupItem: {
    color: themeColors.white,
    fontSize: 14,
    marginBottom: 5,
  },
  navigationToolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: themeColors.primary,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navigationButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  navigationText: {
    color: themeColors.white,
    fontSize: 12,
    marginTop: 5,
  },
});

export default styles;
