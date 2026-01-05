# Present ko sir! - QR Code Attendance System

A modern QR code attendance system designed for instructors to efficiently track student attendance using QR code scanning technology.

##  Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

Open [http://localhost:3000](http://localhost:3000) to see your application running.

##  Development

### Database Commands
```bash
# Push database schema
bun run db:push

# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Reset database
bun run db:reset
```

##  Configuration

### Environment Variables
Create a `.env` file:
```env
DATABASE_URL="file:./db/custom.db"
```

### Default Admin Account (After Database Reset)
- **Email**: admin@attendance.local
- **Password**: admin123


##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

##  License

This project is licensed under the MIT License.

##  Support

For support and questions:
- Check the documentation
- Review the admin panel at `/admin`
- Test with the demo account

---

**Present ko sir!** - Making attendance tracking simple and efficient! 
