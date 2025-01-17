import { StyleSheet, Dimensions } from "react-native";
import { themeColors } from "../theme";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg, // Dark green background
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mailIcon: {
    position: "absolute",
    top: 60, // Adjusted for safe area
    left: 20,
    zIndex: 10,
  },
  logoutIcon: {
    position: "absolute",
    top: 60, // Adjusted for safe area
    right: 20,
    zIndex: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white, // White text
    marginBottom: 5, // Reduced margin for thinner spacing
    marginTop: 20, // Adjusted for top spacing
  },
  listContainer: {
    marginBottom: 5, // Reduced spacing between the list and the carousel
    paddingHorizontal: 10,
  },
  listRow: {
    fontSize: 16,
    color: themeColors.white, // White text
    fontWeight: "bold",
  },
  carouselItem: {
    width: width - 40,
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center", // Added for consistent centering
  },
  activeItem: {
    transform: [{ scale: 1.05 }],
  },
  carouselImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  carouselText: {
    color: themeColors.white, // White text
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center", // Center-align text
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5, // Reduced margin for thinner spacing
    marginBottom: 10, // Reduced margin for thinner spacing
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: themeColors.secondary, // Light teal for indicators
  },
  aiBot: {
    position: "absolute",
    bottom: 120,
    right: 20,
    backgroundColor: themeColors.primary, // Teal background
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBotText: {
    color: themeColors.white, // White text
    fontSize: 16,
    fontWeight: "bold",
  },
  aiBotMessage: {
    position: "absolute",
    bottom: 80,
    right: 10,
    color: themeColors.white, // White text
    fontSize: 14,
    textAlign: "center",
  },
  toolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: themeColors.primary, // Teal background
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  toolbarButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarText: {
    color: themeColors.white, // White text
    fontSize: 12,
    marginTop: 5,
  },
});

export default styles;
