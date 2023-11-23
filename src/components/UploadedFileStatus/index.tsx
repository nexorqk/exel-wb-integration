import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { Box, LinearProgress } from '@mui/material';

interface UploadedFileStatus {
    size: {
        width: number;
        heigth: number;
    };
    isFileLoaded: boolean;
    secondCondition: boolean;
    fileName?: string;
    fileSize: string;
    fileType: string;
    fileIcon: IconDefinition;
    className: string;
}

const LinearIndeterminate = () => {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>
    );
};

const UploadedFileStatus = ({
    size,
    isFileLoaded,
    secondCondition,
    fileName,
    fileSize,
    fileType,
    fileIcon,
    className,
}: UploadedFileStatus) => {
    return (
        <div className={className}>
            <FontAwesomeIcon
                style={{
                    width: size.width,
                    height: size.heigth,
                    color: isFileLoaded ? '#A3B763' : 'grey',
                }}
                icon={fileIcon}
            />
            <div className="file-uploading-status">
                {!isFileLoaded ? (
                    <>
                        <p className="status-text">Выберите файл</p>
                    </>
                ) : secondCondition ? (
                    <>
                        <p className="status-text">В процессе</p>
                        <LinearIndeterminate />
                    </>
                ) : (
                    <>
                        <p className="status-text">Файл загружен</p>
                        <p className="file-name-text">{fileName}</p>
                        <p className="file-name-text">{`${fileSize}, ${fileType}`}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default UploadedFileStatus;
