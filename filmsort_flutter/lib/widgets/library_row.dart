import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class LibraryRow extends StatelessWidget {
  final String title;

  const LibraryRow({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            itemCount: 10, // Mock count
            itemBuilder: (context, index) {
              return Container(
                width: 120,
                margin: const EdgeInsets.symmetric(horizontal: 4.0),
                decoration: BoxDecoration(
                  color: Colors.grey[800],
                  borderRadius: BorderRadius.circular(6.0),
                  image: const DecorationImage(
                    // Placeholder image since we don't have networking hooked up
                    image: NetworkImage("https://via.placeholder.com/150x225/1a1a1a/808080?text=Poster"),
                    fit: BoxFit.cover,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
