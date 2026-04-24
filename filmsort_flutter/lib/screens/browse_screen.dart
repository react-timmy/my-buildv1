import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../widgets/library_row.dart';

class BrowseScreen extends StatelessWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Scaffold allows us to have a background color and body.
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Section (Simulated with Placeholder/Gradient)
            Stack(
              children: [
                Container(
                  height: 500,
                  width: double.infinity,
                  color: Colors.grey[900], // normally an image from network
                  child: const Center(
                    child: Icon(Icons.movie, size: 100, color: Colors.grey),
                  ),
                ),
                // Gradient overlay
                Container(
                  height: 500,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.background,
                        AppColors.background.withOpacity(0.0),
                        AppColors.background,
                      ],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
                // Title and Buttons positioned at bottom of Hero
                Positioned(
                  bottom: 40,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Featured Movie Title",
                        style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        "Action • Sci-Fi • 2023",
                        style: TextStyle(
                            fontSize: 14, color: AppColors.textGrey, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.play_arrow, color: Colors.black),
                              label: const Text("Play", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.info_outline, color: Colors.white),
                              label: const Text("More Info", style: TextStyle(color: Colors.white)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12),
                                side: const BorderSide(color: Colors.white),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            // Rows
            const SizedBox(height: 20),
            const LibraryRow(title: "Trending Now"),
            const LibraryRow(title: "New Releases (TMDB)"),
            const LibraryRow(title: "Top Rated"),
            const LibraryRow(title: "Recently Added to Vault"),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
