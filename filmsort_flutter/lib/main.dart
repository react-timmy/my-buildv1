import 'package:flutter/material.dart';
import 'core/app_colors.dart';
import 'screens/main_navigation.dart';

void main() {
  runApp(const FilmSortApp());
}

class FilmSortApp extends StatelessWidget {
  const FilmSortApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FilmSort',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.brandOrange,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.brandOrange,
          secondary: AppColors.brandBlue,
          background: AppColors.background,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(color: AppColors.textWhite, fontWeight: FontWeight.bold),
          bodyLarge: TextStyle(color: AppColors.textWhite),
          bodyMedium: TextStyle(color: AppColors.textGrey),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.black,
          selectedItemColor: AppColors.textWhite,
          unselectedItemColor: AppColors.textGrey,
          type: BottomNavigationBarType.fixed,
        ),
      ),
      home: const MainNavigation(),
    );
  }
}
