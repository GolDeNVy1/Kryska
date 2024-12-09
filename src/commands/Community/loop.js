const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Буду играть одно и то же (песню или даже всю очередь)')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Повторение треков и плейлистов')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                )),

    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Я сейчас в другой компании!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        let repeatMode = interaction.options.getString('mode');
        try {
            await player.setLoop(repeatMode);

            const successEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle("Повторение настроено!")
                .setDescription(`<@${interaction.user.id}> Окей, повторяю: ${repeatMode === 'none' ? 'выключено' : repeatMode === 'track' ? 'песню' : 'очередь'}.`)
                .setFooter({
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.followUp({ embeds: [successEmbed] });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        }
    }
};
