'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const User = queryInterface.sequelize.define('User', {
            // Define your User model here
        });

        const Role = queryInterface.sequelize.define('Role', {
            // Define your Role model here
        });

        const UserRole = queryInterface.sequelize.define('UserRole', {
            // Define your UserRole model here
        });

        const users = [{
                username: 'user1',
                email: 'user1@example.com',
                password: 'password1'
            },
            {
                username: 'user2',
                email: 'user2@example.com',
                password: 'password2'
            },
            {
                username: 'user3',
                email: 'user3@example.com',
                password: 'password3'
            }
        ];

        const roles = [{
                name: 'admin'
            },
            {
                name: 'user'
            },
            {
                name: 'guest'
            }
        ];

        const userRoles = [{
                userId: 1,
                roleId: 1
            },
            {
                userId: 2,
                roleId: 2
            },
            {
                userId: 3,
                roleId: 2
            },
            {
                userId: 3,
                roleId: 3
            }
        ];

        await User.bulkCreate(users);
        await Role.bulkCreate(roles);
        await UserRole.bulkCreate(userRoles);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Users', null, {});
        await queryInterface.bulkDelete('Roles', null, {});
        await queryInterface.bulkDelete('UserRoles', null, {});
    }
};